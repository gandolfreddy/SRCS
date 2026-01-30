interface Student {
  name: string;
  present: boolean;
  left?: boolean;
}

interface Classroom {
  id: string;
  name: string;
  path: string;
  students: Student[];
}

// 僅使用記憶體儲存，不寫入檔案
const classrooms: Map<string, Classroom> = new Map();
const clients: Set<WebSocket> = new Set();

function broadcast(data: unknown) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // WebSocket 連線
  if (url.pathname === "/ws") {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      clients.add(socket);
      // 傳送目前所有教室資料
      socket.send(JSON.stringify({
        type: "init",
        classrooms: Array.from(classrooms.values())
      }));
    };

    socket.onclose = () => {
      clients.delete(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return response;
  }

  // API 路由
  if (url.pathname === "/api/classrooms" && req.method === "GET") {
    return new Response(
      JSON.stringify(Array.from(classrooms.values())),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (url.pathname === "/api/classrooms" && req.method === "POST") {
    const body = await req.json();
    const id = crypto.randomUUID();

    // 檢查 path 是否已被使用
    for (const classroom of classrooms.values()) {
      if (classroom.path === body.path) {
        return new Response(JSON.stringify({ error: "路徑已被使用" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const classroom: Classroom = {
      id,
      name: body.name,
      path: body.path,
      students: body.students.map((name: string) => ({
        name,
        present: false,
        left: false
      }))
    };
    classrooms.set(id, classroom);
    broadcast({ type: "classroom_added", classroom });
    return new Response(JSON.stringify(classroom), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 批次同步教室資料（用於從 localStorage 恢復）
  if (url.pathname === "/api/classrooms/sync" && req.method === "POST") {
    const body = await req.json();
    const syncedClassrooms: Classroom[] = body.classrooms;

    // 清空現有資料並重新載入
    classrooms.clear();

    for (const classroom of syncedClassrooms) {
      classrooms.set(classroom.id, classroom);
    }

    // 廣播給所有連線的客戶端
    broadcast({
      type: "init",
      classrooms: Array.from(classrooms.values())
    });

    return new Response(JSON.stringify({ success: true, count: classrooms.size }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (url.pathname.startsWith("/api/classrooms/") && req.method === "DELETE") {
    const id = url.pathname.split("/")[3];

    if (!classrooms.has(id)) {
      return new Response("Classroom not found", { status: 404 });
    }

    classrooms.delete(id);
    broadcast({ type: "classroom_deleted", classroomId: id });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (url.pathname.startsWith("/api/classrooms/") && req.method === "PUT") {
    const id = url.pathname.split("/")[3];
    const body = await req.json();
    const classroom = classrooms.get(id);

    if (!classroom) {
      return new Response("Classroom not found", { status: 404 });
    }

    // 檢查新的 path 是否與其他教室衝突
    if (body.path && body.path !== classroom.path) {
      for (const [otherId, otherClassroom] of classrooms.entries()) {
        if (otherId !== id && otherClassroom.path === body.path) {
          return new Response(JSON.stringify({ error: "路徑已被使用" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }

    classroom.name = body.name;
    classroom.path = body.path;
    classroom.students = body.students.map((name: string) => ({
      name,
      present: false,
      left: false
    }));

    broadcast({ type: "classroom_updated", classroom });
    return new Response(JSON.stringify(classroom), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (url.pathname.startsWith("/api/classrooms/") && req.method === "PATCH") {
    const id = url.pathname.split("/")[3];
    const body = await req.json();
    const classroom = classrooms.get(id);

    if (!classroom) {
      return new Response("Classroom not found", { status: 404 });
    }

    if (body.studentIndex !== undefined) {
      const student = classroom.students[body.studentIndex];
      
      if (body.left !== undefined) {
        student.left = body.left;
        student.present = true; // 已離開狀態下保持present為true
      } else if (body.present !== undefined) {
        student.present = body.present;
        if (body.present) {
          student.left = false; // 到達教室時清除離開狀態
        }
      }
      
      broadcast({
        type: "student_updated",
        classroomId: id,
        studentIndex: body.studentIndex,
        present: student.present,
        left: student.left || false
      });
    }

    return new Response(JSON.stringify(classroom), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 靜態檔案
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return serveFile("index.html");
  }

  if (url.pathname === "/admin" || url.pathname === "/admin.html") {
    return serveFile("admin.html");
  }

  if (url.pathname === "/classroom.html") {
    return serveFile("classroom.html");
  }

  // 教室專屬頁面路由 - 需要在靜態檔案之後，404 之前
  const pathMatch = url.pathname.match(/^\/([a-zA-Z0-9\-_]+)$/);
  if (pathMatch) {
    const path = pathMatch[1];
    // 檢查是否有對應的教室
    for (const classroom of classrooms.values()) {
      if (classroom.path === path) {
        return serveFile("classroom.html");
      }
    }
  }

  return new Response("Not Found", { status: 404 });
}

function handleWebSocketMessage(data: any) {
  // WebSocket 訊息處理（如果需要）
}

async function serveFile(filename: string): Promise<Response> {
  try {
    const file = await Deno.readTextFile(new URL(filename, import.meta.url));
    const contentType = filename.endsWith(".html") ? "text/html" : "text/plain";
    return new Response(file, {
      headers: { "Content-Type": contentType }
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}

console.log("Server starting...");
console.log("資料儲存於瀏覽器 localStorage");

Deno.serve(handleRequest);

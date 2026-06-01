import { useState } from "react";
import ResourcePage from "./pages/ResourcePage";
import TodoPage from "./pages/TodoPage";

function App() {
  const [page, setPage] = useState<"resources" | "todo">("resources");

  return (
    <>
      <nav>
        <button onClick={() => setPage("resources")}>資源管理</button>
        <button onClick={() => setPage("todo")}>todoメモ</button>
      </nav>

      {page === "resources" ? <ResourcePage /> : <TodoPage />}
    </>
  );
}

export default App;

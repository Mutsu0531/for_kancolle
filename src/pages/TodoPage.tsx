import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Todo = {
  id: string;
  title: string;
  memo: string | null;
  date: string | null;
  is_done: boolean;
  created_at: string;
};

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("todoの取得に失敗しました: " + error.message);
      return;
    }

    setTodos(data ?? []);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedMemo = memo.trim();

    if (!trimmedTitle) {
      alert("todoのタイトルを入力してください");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("todos").insert([
      {
        title: trimmedTitle,
        memo: trimmedMemo || null,
        date: getToday(),
        is_done: false,
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert("todoの保存に失敗しました: " + error.message);
      return;
    }

    setTitle("");
    setMemo("");
    fetchTodos();
  };

  const toggleTodo = async (todo: Todo) => {
    const { error } = await supabase
      .from("todos")
      .update({ is_done: !todo.is_done })
      .eq("id", todo.id);

    if (error) {
      alert("todoの更新に失敗しました: " + error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, is_done: !item.is_done } : item)),
    );
  };

  const deleteTodo = async (id: string) => {
    const confirmDelete = window.confirm("このtodoを削除しますか？");

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      alert("todoの削除に失敗しました: " + error.message);
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      <section
        style={{
          maxWidth: "320px",
          margin: "15px auto 24px",
          padding: "16px 20px",
          border: "1px solid #eee",
          borderRadius: "8px",
          backgroundColor: "#fff",
          color: "#444",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "2em" }}>todoメモ</h2>
      </section>

      <form
        onSubmit={handleAddTodo}
        style={{
          backgroundColor: "#f4f6f9",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <label
            style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}
          >
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：陸奥を改二に改装"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label
            style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}
          >
            メモ
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="補足があれば入力"
            rows={3}
            style={{
              width: "100%",
              padding: "8px",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? "#ccc" : "#d4edd4",
            width: "100%",
            fontSize: "15px",
            border: "none",
            padding: "10px",
            cursor: isLoading ? "not-allowed" : "pointer",
            borderRadius: "8px",
            fontWeight: "bold",
            color: "#464646",
          }}
        >
          {isLoading ? "保存中..." : "追加する"}
        </button>
      </form>

      <section>
        <h3 style={{ marginTop: 0 }}>todo一覧</h3>

        {todos.length === 0 ? (
          <p style={{ color: "#666" }}>todoはまだありません。</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {todos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  padding: "14px",
                  backgroundColor: todo.is_done ? "#f0f2f5" : "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={todo.is_done}
                  onChange={() => toggleTodo(todo)}
                  style={{ width: "20px", height: "20px", cursor: "pointer", marginTop: "2px" }}
                />

                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#666" }}>
                    {todo.date ?? todo.created_at.split("T")[0]}
                  </p>
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontWeight: "bold",
                      color: todo.is_done ? "#888" : "#333",
                      textDecoration: todo.is_done ? "line-through" : "none",
                    }}
                  >
                    {todo.title}
                  </p>

                  {todo.memo && (
                    <p style={{ margin: 0, color: "#555", fontSize: "0.95em", lineHeight: "1.5" }}>
                      {todo.memo}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteTodo(todo.id)}
                  style={{
                    backgroundColor: "#f07f7f",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TodoPage;

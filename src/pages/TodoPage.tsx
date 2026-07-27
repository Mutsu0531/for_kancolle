import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// MUI機能
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");

  const activeTodos = todos.filter((todo) => !todo.is_done);
  const completedTodos = todos.filter((todo) => todo.is_done);

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
      alert("タイトルを入力してください");
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
      alert("保存に失敗しました: " + error.message);
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
      alert("更新に失敗しました: " + error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, is_done: !item.is_done } : item)),
    );
  };

  const startEditTodo = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditMemo(todo.memo ?? "");
  };

  const cancelEditTodo = () => {
    setEditingId(null);
    setEditTitle("");
    setEditMemo("");
  };

  const saveEditTodo = async (id: string) => {
    const trimmedTitle = editTitle.trim();
    const trimmedMemo = editMemo.trim();

    if (!trimmedTitle) {
      alert("タイトルを入力してください");
      return;
    }

    const { error } = await supabase
      .from("todos")
      .update({
        title: trimmedTitle,
        memo: trimmedMemo || null,
      })
      .eq("id", id);

    if (error) {
      alert("更新に失敗しました: " + error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, title: trimmedTitle, memo: trimmedMemo || null } : todo,
      ),
    );
    cancelEditTodo();
  };

  const deleteTodo = async (id: string) => {
    const confirmDelete = window.confirm("このtodoを削除しますか？");

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <Box sx={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <Paper
        elevation={1}
        sx={{
          maxWidth: "320px",
          margin: "15px auto 24px",
          padding: "16px 20px",
          borderRadius: "8px",
          color: "#444",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "2em" }}>ToDoメモ</h2>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: "24px",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <Paper
          component="section"
          elevation={1}
          sx={{
            flex: "1 1 520px",
            minWidth: 0,
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>メモ一覧</h3>

          {activeTodos.length === 0 ? (
            <p style={{ color: "#666" }}>todoはまだありません。</p>
          ) : (
            <Box sx={{ display: "grid", gap: "12px" }}>
              {activeTodos.map((todo) => {
                const isEditing = editingId === todo.id;

                return (
                  <Paper
                    key={todo.id}
                    elevation={1}
                    sx={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      borderRadius: "8px",
                      padding: "14px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#666" }}>
                        {todo.date ?? todo.created_at.split("T")[0]}
                      </p>

                      {isEditing ? (
                        <Box sx={{ display: "grid", gap: "8px" }}>
                          <TextField
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="タイトル"
                            fullWidth
                            size="small"
                          />
                          <TextField
                            value={editMemo}
                            onChange={(e) => setEditMemo(e.target.value)}
                            placeholder="メモ"
                            multiline
                            rows={3}
                            fullWidth
                            size="small"
                          />
                        </Box>
                      ) : (
                        <>
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
                            <p
                              style={{
                                margin: 0,
                                color: "#555",
                                fontSize: "0.95em",
                                lineHeight: "1.5",
                              }}
                            >
                              {todo.memo}
                            </p>
                          )}
                        </>
                      )}
                    </Box>

                    {isEditing ? (
                      <Box sx={{ display: "flex", gap: "8px" }}>
                        <Button
                          type="button"
                          variant="contained"
                          onClick={() => saveEditTodo(todo.id)}
                          sx={{
                            backgroundColor: "#d4edd4",
                            color: "#464646",
                            borderRadius: "4px",
                            px: 1.5,
                            py: 1,
                            whiteSpace: "nowrap",
                            boxShadow: "none",
                            "&:hover": {
                              backgroundColor: "#c2e3c2",
                              boxShadow: "none",
                            },
                          }}
                        >
                          保存
                        </Button>
                        <button
                          type="button"
                          onClick={cancelEditTodo}
                          style={{
                            backgroundColor: "#ccc",
                            color: "#333",
                            border: "none",
                            borderRadius: "4px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          キャンセル
                        </button>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => toggleTodo(todo)}
                          style={{
                            backgroundColor: "#ffe294",
                            color: "#464646",
                            border: "none",
                            borderRadius: "4px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          完了
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditTodo(todo)}
                          style={{
                            backgroundColor: "#b6ebec",
                            color: "#464646",
                            border: "none",
                            borderRadius: "4px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          編集
                        </button>
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
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </Paper>

        <Paper
          component="form"
          onSubmit={handleAddTodo}
          elevation={1}
          sx={{
            flex: "0 1 320px",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>メモ入力欄</h3>
          <Box sx={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              タイトル
            </label>
            <TextField
              label=""
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：陸奥を改二に改装"
              fullWidth
            />
          </Box>

          <Box sx={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              メモ
            </label>
            <TextField
              label=""
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="補足があれば入力"
              multiline
              rows={3}
              fullWidth
            />
          </Box>

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
        </Paper>
      </Box>

      <Paper
        component="details"
        elevation={1}
        sx={{
          marginTop: "24px",
          borderRadius: "8px",
          padding: "0 16px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontSize: "1.2em",
            fontWeight: "bold",
            padding: "16px 0",
            color: "#2b2b2b",
            backgroundColor: "#edf2f7",
          }}
        >
          達成済み ({completedTodos.length}件)
        </summary>

        {completedTodos.length === 0 ? (
          <p style={{ margin: "0 0 16px", color: "#666" }}>達成済みのtodoはまだありません。</p>
        ) : (
          <Box sx={{ display: "grid", gap: "12px", paddingBottom: "16px" }}>
            {completedTodos.map((todo) => (
              <Paper
                key={todo.id}
                elevation={1}
                sx={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  borderRadius: "8px",
                  padding: "14px",
                  backgroundColor: "#fff",
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#666" }}>
                    {todo.date ?? todo.created_at.split("T")[0]}
                  </p>
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontWeight: "bold",
                      color: "#888",
                      textDecoration: "line-through",
                    }}
                  >
                    {todo.title}
                  </p>

                  {todo.memo && (
                    <p style={{ margin: 0, color: "#555", fontSize: "0.95em", lineHeight: "1.5" }}>
                      {todo.memo}
                    </p>
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo)}
                    style={{
                      backgroundColor: "#ccc",
                      color: "#333",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    未完了
                  </button>
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
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default TodoPage;

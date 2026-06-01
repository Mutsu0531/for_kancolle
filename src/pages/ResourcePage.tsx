import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const getGameDay = () => {
  const now = new Date();
  // 現在時刻から5時間を引く
  const offsetDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  // その結果の yyyy-mm-dd を返す
  return offsetDate.toISOString().split("T")[0];
};

function App() {
  const [formData, setFormData] = useState({
    fuel: "",
    ammo: "",
    steel: "",
    bauxite: "",
    bucket: "",
    dev_material: "",
    improvement_material: "",
    memo: "",
  });

  const [previousData, setPreviousData] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]); // 履歴用
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({}); // エラーメッセージを管理
  const inputDigitLimits: { [key: string]: number } = {
    fuel: 6,
    ammo: 6,
    steel: 6,
    bauxite: 6,
    bucket: 4,
    dev_material: 4,
    improvement_material: 4,
  };

  // 表示用の名前を管理するリスト
  const resourceLabels: { [key: string]: string } = {
    fuel: "燃料",
    ammo: "弾薬",
    steel: "鋼材",
    bauxite: "ボーキサイト",
    bucket: "バケツ",
    dev_material: "開発資材",
    improvement_material: "改修資材",
  };

  //useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false }) // 最新の日付を参照
      .limit(10);

    if (!error && data && data.length > 0) {
      setHistory(data);
      setPreviousData(data[0]);
    }
  };
  useEffect(() => {
    fetchData();
    fetchAllChartData(); // 初回読み込み用
  }, []);

  const fetchAllChartData = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("date", { ascending: true }); // グラフは古い順なので昇順

    if (!error && data) {
      setAllChartData(data);
    }
  };

  // 削除関数
  // チェックボックスのON/OFFを切り替える関数
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // 選択された項目を一括削除する関数
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert("削除する項目を選択してください");
      return;
    }

    const confirmDelete = window.confirm(
      `選択された ${selectedIds.length} 件のデータを本当に削除しますか？`,
    );

    if (confirmDelete) {
      const { error } = await supabase.from("resources").delete().in("id", selectedIds); // 選択されたIDリストに含まれるものを一括削除

      if (error) {
        alert("削除に失敗しました: " + error.message);
      } else {
        alert("削除しました");
        setSelectedIds([]); // 選択状態をリセット
        fetchData(); // 履歴を更新
        fetchAllChartData(); // グラフ更新
      }
    }
  };
  /*const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("本当に削除しますか？");

    if(confirmDelete) {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      
    if(error) {alert('削除に失敗しました: ' + error.message);}
    else {alert('削除しました'); fetchData();}
    }
  };*/

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "memo") {
      setFormData({ ...formData, [name]: value });
      return;
    }
    const digitLimit = inputDigitLimits[name];
    const isValidInteger = /^\d*$/.test(value);

    if (!isValidInteger || (digitLimit && value.length > digitLimit)) {
      return;
    }

    const numValue = Number(value);

    // チェック対象の資源リスト
    const cappedResources = ["fuel", "ammo", "steel", "bauxite"];
    const LIMIT = 350000;

    // 上限チェック
    if (cappedResources.includes(name) && numValue > LIMIT) {
      setErrors({ ...errors, [name]: "上限を超えています" });
    } else {
      setErrors({ ...errors, [name]: null });
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 5:00区切りの日付を取得
    const gameDay = getGameDay();
    const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (key === "memo") {
        acc[key] = value;
      } else {
        acc[key] = value === "" ? (previousData[key] ?? 0) : Number(value);
      }
      return acc;
    }, {} as any);

    /*const { error } = await supabase.from('resources').insert([
      { date: today, ...sanitizedData }
    ]);*/
    // insert を upsert に変更
    // onConflict: 'date' を指定することで、同じ日付なら上書きする
    const { error } = await supabase
      .from("resources")
      .upsert([{ date: gameDay, ...sanitizedData }], { onConflict: "date" });

    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      alert("保存成功しました！");
      fetchData();
      fetchAllChartData();
      //　ここにフォームを空にする処理
      setFormData({
        fuel: "",
        ammo: "",
        steel: "",
        bauxite: "",
        dev_material: "",
        improvement_material: "",
        bucket: "",
        memo: "",
      });
    }
  };

  // グラフ切り替え用
  const [chartType, setChartType] = useState<"A" | "B">("A");
  const axisOptionsA = [0, 50000, 100000, 150000, 200000, 250000, 300000, 350000];
  const axisOptionsB = Array.from({ length: 31 }, (_, i) => i * 100);

  // AとBそれぞれの縦軸範囲管理
  const [minA, setMinA] = useState(0);
  const [maxA, setMaxA] = useState(350000);
  const [minB, setMinB] = useState(0);
  const [maxB, setMaxB] = useState(3000);

  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({
    fuel: true,
    ammo: true,
    steel: true,
    bauxite: true,
    bucket: true,
    dev_material: true,
    improvement_material: true,
  });

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setVisibleLines((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey], // 状態を反転させる
    }));
  };

  // Aグループの設定
  const configA = [
    { key: "fuel", label: "燃料", color: "#31a231" },
    { key: "ammo", label: "弾薬", color: "#edad0b" },
    { key: "steel", label: "鋼材", color: "#999" },
    { key: "bauxite", label: "ボーキ", color: "#e67e22" },
  ];

  // Bグループの設定
  const configB = [
    { key: "bucket", label: "バケツ", color: "#3e9a5c" },
    { key: "dev_material", label: "開発資材", color: "#4074b8" },
    { key: "improvement_material", label: "改修資材", color: "#9b59b6" },
  ];

  const currentConfig = chartType === "A" ? configA : configB;
  const currentMin = chartType === "A" ? minA : minB;
  const currentMax = chartType === "A" ? maxA : maxB;
  const setChartMin = (value: number) => {
    if (chartType === "A") {
      setMinA(value);
      if (value >= maxA) {
        setMaxA(350000);
      }
    } else {
      setMinB(value);
      if (value >= maxB) {
        setMaxB(3000);
      }
    }
  };
  const setChartMax = (value: number) => {
    if (chartType === "A") {
      setMaxA(value);
      if (value <= minA) {
        setMinA(0);
      }
    } else {
      setMaxB(value);
      if (value <= minB) {
        setMinB(0);
      }
    }
  };
  const sortLegendItems = (item: any) => {
    return currentConfig.findIndex((config) => config.key === item.dataKey);
  };
  // グラフ用の全データ
  const [allChartData, setAllChartData] = useState<any[]>([]);

  // 表示範囲（初期値：1ヶ月前〜今日）
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // 選択された期間内のデータのみを抽出(return直前に配置)
  const filteredData = allChartData.filter((item) => {
    return item.date >= startDate && item.date <= endDate;
  });

  console.log(allChartData); // デバッグ用

  return (
    <div style={{ padding: "0px", maxWidth: "1300px", margin: "0 auto" }}>
      <section
        style={{
          maxWidth: "300px",
          margin: "15px auto 0",
          padding: "16px 20px",
          border: "1px solid #eee",
          borderRadius: "8px",
          backgroundColor: "#fff",
          color: "#444",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0", fontSize: "2em" }}>資源管理</h2>
      </section>
      {/* 上段　資源記録とグラフを横並びにするエリア */}
      <div
        style={{
          padding: "10px",
          display: "flex",
          gap: "40px",
          alignItems: "flex-start",
          marginBottom: "40px",
        }}
      >
        {/* 資源記録フォーム */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: "200px",
            flexShrink: 0,
            backgroundColor: "#f4f6f9",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>資源記録</h2>
          {Object.entries(resourceLabels).map(([key, label]) => (
            <div key={key} style={{ marginBottom: "10px" }}>
              <label
                style={{ display: "block", fontSize: "14px", fontWeight: "bold", color: "#2b2b2b" }}
              >
                {label}
              </label>
              <input
                type="number"
                name={key}
                value={formData[key as keyof typeof formData]}
                onChange={handleChange}
                max={10 ** inputDigitLimits[key] - 1}
                min={0}
                placeholder={`前回: ${previousData[key] ?? 0}`}
                style={{ width: "100%", padding: "5px", boxSizing: "border-box" }}
              />
              {errors[key] && (
                <p style={{ color: "red", fontSize: "12px", margin: "0" }}>{errors[key]}</p>
              )}
            </div>
          ))}

          {/* メモ入力欄 */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{ display: "block", fontSize: "14px", fontWeight: "bold", color: "#2b2b2b" }}
            >
              メモ
            </label>
            <textarea
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              placeholder="ここにメモを書けます &#13;&#10;例：夏イベ開始"
              rows={2}
              style={{
                width: "100%",
                padding: "5px",
                boxSizing: "border-box",
                borderRadius: "4px",
                border: "1px solid #ccc",
                resize: "none", // 枠のサイズ変更を固定
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: "#d4edd4",
              width: "100%",
              fontSize: "15px",
              border: "none",
              padding: "10px",
              cursor: "pointer",
              borderRadius: "8px",
              fontWeight: "bold",
              color: "#464646",
            }}
          >
            保存する
          </button>
        </form>

        {/* 資源推移グラフ */}
        <div
          style={{
            flexGrow: 1,
            minWidth: 0,
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #eee",
            overflow: "hidden",
          }}
        >
          <h2 style={{ marginTop: 0 }}>資源推移グラフ</h2>

          <div style={{ display: "flex", gap: "20px", marginBottom: "15px", flexWrap: "wrap" }}>
            {/* グラフ切り替え */}
            <div>
              <button
                onClick={() => setChartType("A")}
                style={{ fontWeight: chartType === "A" ? "bold" : "normal" }}
              >
                4資源
              </button>
              <button
                onClick={() => setChartType("B")}
                style={{ fontWeight: chartType === "B" ? "bold" : "normal", marginLeft: "5px" }}
              >
                資材
              </button>
            </div>

            {/* 下限値調整 */}
            <div>
              <label style={{ fontSize: "14px" }}>縦軸下限: </label>
              <select value={currentMin} onChange={(e) => setChartMin(Number(e.target.value))}>
                {(chartType === "A" ? axisOptionsA.slice(0, -1) : axisOptionsB.slice(0, -1)).map(
                  (v) => (
                    <option key={v} value={v}>
                      {v.toLocaleString()}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* 上限値調整 */}
            <div>
              <label style={{ fontSize: "14px" }}>縦軸上限: </label>
              <select value={currentMax} onChange={(e) => setChartMax(Number(e.target.value))}>
                {chartType === "A"
                  ? axisOptionsA.slice(1).map((v) => (
                      <option key={v} value={v}>
                        {v.toLocaleString()}
                      </option>
                    ))
                  : axisOptionsB.slice(1).map((v) => (
                      <option key={v} value={v}>
                        {v.toLocaleString()}
                      </option>
                    ))}
              </select>
            </div>

            {/* 期間選択 */}
            <div>
              <label style={{ fontSize: "14px" }}>表示期間: </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "2px" }}
              />
              <span> 〜 </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: "2px" }}
              />
            </div>
          </div>

          {/* グラフ本体 */}
          <div style={{ width: "100%", height: "400px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  domain={[currentMin, currentMax]}
                  allowDataOverflow
                  tickCount={6} // 5分割
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  itemSorter={sortLegendItems}
                  onClick={handleLegendClick}
                  wrapperStyle={{ cursor: "pointer" }}
                />
                {chartType === "A" ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="fuel"
                      name="燃料"
                      stroke="#31a231"
                      hide={!visibleLines.fuel}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="ammo"
                      name="弾薬"
                      stroke="#c49111"
                      hide={!visibleLines.ammo}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="steel"
                      name="鋼材"
                      stroke="#757575"
                      hide={!visibleLines.steel}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="bauxite"
                      name="ボーキサイト"
                      stroke="#e67e22"
                      hide={!visibleLines.bauxite}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="bucket"
                      name="バケツ"
                      stroke="#3e9a5c"
                      hide={!visibleLines.bucket}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="dev_material"
                      name="開発資材"
                      stroke="#4074b8"
                      hide={!visibleLines.dev_material}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="improvement_material"
                      name="改修資材"
                      stroke="#9b59b6"
                      hide={!visibleLines.improvement_material}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #eee", marginBottom: "40px" }} />

      {/* 下段　履歴表示エリア */}
      <details
        style={{
          maxWidth: "800px",
          margin: "0 auto", // 中央寄せ
          border: "1px solid #eee",
          borderRadius: "8px",
          backgroundColor: "#f4f6f9",
          padding: "0 16px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontSize: "1.5em",
            fontWeight: "bold",
            padding: "16px 0",
            color: "#2b2b2b",
          }}
        >
          履歴（直近10回）
          {selectedIds.length > 0 && (
            <span style={{ marginLeft: "12px", fontSize: "14px", color: "#f07f7f" }}>
              {selectedIds.length}件選択中
            </span>
          )}
        </summary>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "20px",
            paddingBottom: "16px",
          }}
        >
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #eee",
                borderRadius: "8px",
                padding: "15px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
                backgroundColor: "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                style={{ cursor: "pointer", width: "20px", height: "20px" }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#666" }}>
                  {item.date}
                </p>
                <p style={{ margin: "0", fontSize: "0.95em", lineHeight: "1.5" }}>
                  燃:{item.fuel} / 弾:{item.ammo} / 鋼:{item.steel} / ボ:{item.bauxite}
                  <br />
                  開:{item.dev_material} / 改:{item.improvement_material} / バ:{item.bucket}
                </p>
                {item.memo && (
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      fontSize: "0.85em",
                      color: "#555",
                      backgroundColor: "#f0f2f5",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      borderLeft: "3px solid #4074b8",
                    }}
                  >
                    {item.memo}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              margin: "4px 0 20px",
              backgroundColor: selectedIds.length > 0 ? "#f07f7f" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "12px 24px",
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
            }}
            disabled={selectedIds.length === 0}
          >
            選択した項目を削除する ({selectedIds.length}件)
          </button>
        )}
      </details>

      <section
        style={{
          maxWidth: "800px",
          margin: "24px auto 0",
          padding: "16px 20px",
          border: "1px solid #eee",
          borderRadius: "8px",
          backgroundColor: "#fff",
          color: "#444",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0", fontSize: "1.1em" }}>注意事項</h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "80px",
            lineHeight: "1.8",
            fontSize: "0.95em",
            textAlign: "left",
          }}
        >
          <li>日付は午前5時を区切りとして記録されます。</li>
          <li>入力欄を空欄のまま保存した場合、その項目は前回の値で保存されます。</li>
          <li>
            同じ日付のデータを保存すると、既存の記録（同じ日付に記録したデータ）は上書きされます。
          </li>
          <li>履歴から削除したデータは元に戻せないため、削除前に内容を確認してください。</li>
        </ul>
      </section>
    </div>
  );
}

// Tooltipの見た目と表示内容をカスタムするコンポーネント
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "12px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
      >
        <p style={{ margin: "0 0 6px 0", fontWeight: "bold", color: "#333" }}>{label}</p>

        {/* 各資源の数値をループ表示 */}
        {payload.map((entry: any) => (
          <div key={entry.dataKey} style={{ color: entry.stroke, fontWeight: "medium" }}>
            {entry.name}: {Number(entry.value).toLocaleString()}
          </div>
        ))}

        {/* メモが存在する場合のみ、区切り線と一緒に表示 */}
        {data.memo && (
          <div
            style={{
              marginTop: "8px",
              paddingTop: "6px",
              borderTop: "1px dashed #bbb",
              color: "#555",
              fontSize: "13px",
              maxWidth: "200px",
              wordBreak: "break-all",
            }}
          >
            <strong style={{ color: "#4074b8" }}>📝 メモ:</strong>
            <br />
            {data.memo}
          </div>
        )}
      </div>
    );
  }
  return null;
};
export default App;

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const getGameDay = () => {
  const now = new Date();
  // 現在時刻から5時間を引く
  const offsetDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  // その結果の yyyy-mm-dd を返す
  return offsetDate.toISOString().split('T')[0];
};

function App() {
  const [formData, setFormData] = useState({
    fuel: '', ammo: '', steel: '', bauxite: '', dev_material: '', improvement_material: '', bucket: ''
  });

  const [previousData, setPreviousData] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]); // 履歴用
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({}); // エラーメッセージを管理
  
  // 表示用の名前を管理するリスト
  const resourceLabels: { [key: string]: string } = {
    fuel: '燃料',
    ammo: '弾薬',
    steel: '鋼材',
    bauxite: 'ボーキサイト',
    dev_material: '開発資材',
    improvement_material: '改修資材',
    bucket: 'バケツ'
  };

  //useEffect(() => {
  const fetchData = async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false}) // 最新の日付を参照
        .limit(10);
    
      if(!error && data && data.length > 0) {
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
    .from('resources')
    .select('*')
    .order('date', { ascending: true }); // グラフは古い順なので昇順

    if (!error && data) {
      setAllChartData(data);
    }
  };

  // 削除関数
  // チェックボックスのON/OFFを切り替える関数
const toggleSelect = (id: string) => {
  setSelectedIds(prev => 
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );
};

// 選択された項目を一括削除する関数
const handleBulkDelete = async () => {
  if (selectedIds.length === 0) {
    alert("削除する項目を選択してください");
    return;
  }

  const confirmDelete = window.confirm(`選択された ${selectedIds.length} 件のデータを本当に削除しますか？`);

  if (confirmDelete) {
    const { error } = await supabase
      .from('resources')
      .delete()
      .in('id', selectedIds); // 選択されたIDリストに含まれるものを一括削除

    if (error) {
      alert('削除に失敗しました: ' + error.message);
    } else {
      alert('削除しました');
      setSelectedIds([]);   // 選択状態をリセット
      fetchData();          // 履歴を更新
      fetchAllChartData();  // グラフ更新
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  const numValue = Number(value);
  
  // チェック対象の資源リスト
  const cappedResources = ['fuel', 'ammo', 'steel', 'bauxite'];
  const LIMIT = 350000;

  // 上限チェック
  if (cappedResources.includes(name) && numValue > LIMIT) {
    setErrors({ ...errors, [name]: '上限を超えています' });
  } else {
    setErrors({ ...errors, [name]: null });
  }

  setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const today = new Date().toISOString().split('T')[0];
    // 5:00区切りの日付を取得
    const gameDay = getGameDay();
    const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => {
      acc[key] = value === '' ? (previousData[key] ?? 0) : Number(value);
      return acc;
      },{} as any);

    /*const { error } = await supabase.from('resources').insert([
      { date: today, ...sanitizedData }
    ]);*/
    // insert を upsert に変更
    // onConflict: 'date' を指定することで、同じ日付なら上書きする
    const { error } = await supabase.from('resources').upsert(
      [{ date: gameDay, ...sanitizedData }],
      { onConflict: 'date' } 
    );

    if (error) {
      alert('保存に失敗しました: ' + error.message);
    } else {
      alert('保存成功しました！');
      fetchData();
      fetchAllChartData();
      //　ここにフォームを空にする処理
      setFormData({
        fuel: '', ammo: '', steel: '', bauxite: '', 
        dev_material: '', improvement_material: '', bucket: ''
      });
    }
  };

  // グラフ切り替え用
  const [chartType, setChartType] = useState<'A' | 'B'>('A');
  // AとBそれぞれの上限値管理
  const [maxA, setMaxA] = useState(350000);
  const [maxB, setMaxB] = useState(3000);

  const [visibleLines, setVisibleLines] = useState<{[key: string]: boolean}>({
    fuel: true,
    ammo: true,
    steel: true,
    bauxite: true,
    dev_material: true,
    improvement_material: true,
    bucket: true,
  });

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setVisibleLines((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey], // 状態を反転させる
    }));
  };

  // グラフ用のデータを整形（日付順に）
  const chartData = [...history].reverse(); 

  // Aグループの設定
  const configA = [
    { key: 'fuel', label: '燃料', color: '#31a231' },
    { key: 'ammo', label: '弾薬', color: '#edad0b' },
    { key: 'steel', label: '鋼材', color: '#999' },
    { key: 'bauxite', label: 'ボーキ', color: '#e67e22' },
  ];

  // Bグループの設定
  const configB = [
    { key: 'dev_material', label: '開発資材', color: '#20a09a' },
    { key: 'improvement_material', label: '改修資材', color: '#9b59b6' },
    { key: 'bucket', label: 'バケツ', color: '#42a56f'}
  ];

  const currentConfig = chartType === 'A' ? configA : configB;
  const currentMax = chartType === 'A' ? maxA : maxB;
  // グラフ用の全データ
  const [allChartData, setAllChartData] = useState<any[]>([]);

  // 表示範囲（初期値：1ヶ月前〜今日）
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // 選択された期間内のデータのみを抽出(return直前に配置)
  const filteredData = allChartData.filter(item => {
    return item.date >= startDate && item.date <= endDate;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* 上段　資源記録とグラフを横並びにするエリア */}
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', marginBottom: '40px' }}>
        
        {/* 資源記録フォーム */}
        <form onSubmit={handleSubmit} style={{ width: '200px', flexShrink: 0, backgroundColor: '#f4f6f9', padding: '20px', borderRadius: '8px' }}> 
          <h2 style={{ marginTop: 0 }}>資源記録</h2>
          {Object.entries(resourceLabels).map(([key, label]) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '14px' , fontWeight: 'bold', color: '#2b2b2b'}}>{label}</label>
              <input
                type="number"
                name={key}
                value={formData[key as keyof typeof formData]}
                onChange={handleChange}
                placeholder={`前回: ${previousData[key] ?? 0}`}
                style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
              />
              {errors[key] && (
                <p style={{ color: 'red', fontSize: '12px', margin: '0' }}>{errors[key]}</p>
              )}
            </div>
          ))}
          <button type="submit" style={{ backgroundColor:  '#d4edd4', width: '100%', fontSize: '15px', border: 'none', padding: '10px', cursor: 'pointer',borderRadius: '8px', fontWeight: 'bold', color: '#464646' }}>保存する</button>
        </form>

        {/* 資源推移グラフ */}
        <div style={{ flexGrow: 1, minWidth: 0, backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
          <h2 style={{ marginTop: 0 }}>資源推移グラフ</h2>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
            {/* グラフ切り替え */}
            <div>
              <button onClick={() => setChartType('A')} style={{ fontWeight: chartType === 'A' ? 'bold' : 'normal' }}>4資源</button>
              <button onClick={() => setChartType('B')} style={{ fontWeight: chartType === 'B' ? 'bold' : 'normal', marginLeft: '5px' }}>資材</button>
            </div>

            {/* 上限値調整 */}
            <div>
              <label style={{ fontSize: '14px' }}>縦軸上限: </label>
              <select 
                value={currentMax} 
                onChange={(e) => chartType === 'A' ? setMaxA(Number(e.target.value)) : setMaxB(Number(e.target.value))}
              >
                {chartType === 'A' 
                  ? [50000, 100000, 150000, 200000, 250000, 300000, 350000].map(v => <option key={v} value={v}>{v.toLocaleString()}</option>)
                  : Array.from({length: 30}, (_, i) => (i + 1) * 100).map(v => <option key={v} value={v}>{v.toLocaleString()}</option>)
                }
              </select>
            </div>

            {/* 期間選択 */}
            <div>
              <label style={{ fontSize: '14px' }}>表示期間: </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '2px' }} />
              <span> 〜 </span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '2px' }} />
            </div>
          </div>

          {/* グラフ本体 */}
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  domain={[0, currentMax]} 
                  tickCount={6} // 5分割
                />
                <Tooltip />
                <Legend onClick={handleLegendClick} wrapperStyle={{ cursor: 'pointer' }} />
                {chartType === 'A' ? (
                  <>
                  <Line type="monotone" dataKey="fuel" name="燃料" stroke="#31a231" 
                        hide={!visibleLines.fuel} strokeWidth={2} dot={{ r: 4 }} connectNulls />
      
                  <Line type="monotone" dataKey="ammo" name="弾薬" stroke="#c49111" 
                        hide={!visibleLines.ammo} strokeWidth={2} dot={{ r: 4 }} connectNulls />
      
                  <Line type="monotone" dataKey="steel" name="鋼材" stroke="#757575" 
                        hide={!visibleLines.steel} strokeWidth={2} dot={{ r: 4 }} connectNulls />
      
                  <Line type="monotone" dataKey="bauxite" name="ボーキサイト" stroke="#e67e22" 
                        hide={!visibleLines.bauxite} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                        </>
                        ) : (
                  <>
                  <Line type="monotone" dataKey="dev_material" name="開発資材" stroke="#20a09a" 
                        hide={!visibleLines.dev_material} strokeWidth={2} dot={{ r: 4 }} connectNulls />
      
                  <Line type="monotone" dataKey="improvement_material" name="改修資材" stroke="#9b59b6" 
                        hide={!visibleLines.improvement_material} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  
                  <Line type="monotone" dataKey="bucket" name="バケツ" stroke="#42a56f" 
                        hide={!visibleLines.bucket} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                        </>
                        )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '40px' }} />

      {/* 下段　履歴表示エリア */}
      <div style={{ maxWidth: '800px' }}>
        <h2>履歴（直近10回）</h2> 
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {history.map((item) => (
            <div key={item.id}
              style={{ 
                border: '1px solid #eee',
                borderRadius: '8px',
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                backgroundColor: '#fff'
              }}
            >
              <input 
                type="checkbox" 
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                style={{ cursor: 'pointer', width: '20px', height: '20px' }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#666' }}>{item.date}</p>
                <p style={{ margin: '0', fontSize: '0.95em', lineHeight: '1.5' }}>
                  燃:{item.fuel} / 弾:{item.ammo} / 鋼:{item.steel} / ボ:{item.bauxite}<br/>
                  開:{item.dev_material} / 改:{item.improvement_material} / バ:{item.bucket}
                </p>
              </div>
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              marginTop: '20px',
              backgroundColor: selectedIds.length > 0 ? '#f07f7f' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '12px 24px',
              cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            }}
            disabled={selectedIds.length === 0}
          >
            選択した項目を削除する ({selectedIds.length}件)
          </button>
        )}
      </div>

    </div>
  );
}

export default App;
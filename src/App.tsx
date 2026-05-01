import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

function App() {
  const [formData, setFormData] = useState({
    fuel: '', ammo: '', steel: '', bauxite: '', dev_material: '', improvement_material: ''
  });

  const [previousData, setPreviousData] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]); // 履歴用
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({}); // エラーメッセージを管理する

  // 表示用の名前を管理するリスト
  const resourceLabels: { [key: string]: string } = {
    fuel: '燃料',
    ammo: '弾薬',
    steel: '鋼材',
    bauxite: 'ボーキサイト',
    dev_material: '開発資材',
    improvement_material: '改修資材'
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
  }, []);
  
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
      setSelectedIds([]); // 選択状態をリセット
      fetchData();        // 履歴を更新
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
    
    const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => {
      acc[key] = value === '' ? (previousData[key] ?? 0) : Number(value);
      return acc;
      },{} as any);

    const { error } = await supabase.from('resources').insert([
      { date: today, ...sanitizedData }
    ]);

    if (error) {
      alert('保存に失敗しました: ' + error.message);
    } else {
      alert('保存成功しました！');
      fetchData();
      //　ここにフォームを空にする処理追加
    }
  };

  return (
    <div style={{ display: 'flex', gap: '40px', padding: '20px' }}>
    
    {/* 左側：履歴表示エリア */}
    <div style={{ width: '400px' }}>
      <h2>履歴（直近10回）</h2> 
        {history.map((item) => (
          <div key={item.id}
            style={{ 
                    borderBottom: '1px solid #ccc',
                    marginBottom: '5px',
                    paddingBottom: '10px',
                    display: 'flex',
                    alignItems: 'center', // 垂直方向を中央に
                    gap: '10px'           // チェックボックスとテキストの隙間
                  }}
            >
      {/* 選択用チェックボックス */}
        <input 
          type="checkbox" 
          checked={selectedIds.includes(item.id)}
          onChange={() => toggleSelect(item.id)}
          style={{ cursor: 'pointer', width: '20px', height: '20px' }}
        />
        
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>{item.date}</p>
            <p style={{ margin: '0', fontSize: '0.9em' }}>
              燃:{item.fuel} / 弾:{item.ammo} / 鋼:{item.steel} / ボ:{item.bauxite} / 開:{item.dev_material} / 改:{item.improvement_material}
            </p>
          </div>
        </div>
    ))}

    {/* 一括削除ボタン(履歴リストのすぐ下に配置) */}
    {history.length > 0 && (
      <button
        onClick={handleBulkDelete}
        style={{
                marginTop: '10px',
                backgroundColor: selectedIds.length > 0 ? '#f07f7f' : '#ccc', // 選択中のみ赤くする
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 20px',
                cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
      disabled={selectedIds.length === 0}
      >
      選択した項目を削除する ({selectedIds.length}件)
      </button>
    )}
    </div>

    <form onSubmit={handleSubmit} style={{ width: '350px'}}> 
      <h2>資源記録</h2>
      {/* Object.entriesを使ってリストから名前を取り出して表示 */}
      {Object.entries(resourceLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block' }}>{label}</label>
          <input
            type="number"
            name={key}
            value={formData[key as keyof typeof formData]}
            onChange={handleChange}
            // 直近の値を表示する
            placeholder={`前回: ${previousData[key] ?? 0}`}
          />
          {/* エラーがある場合メッセージを表示 */}
          {errors[key] && (
            <p style={{ color: 'red', fontSize: '12px', margin: '0' }}>{errors[key]}</p>
          )}
        </div>
      ))}
      <button type="submit">保存する</button>
    </form>

    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

function App() {
  const [formData, setFormData] = useState({
    fuel: '', ammo: '', steel: '', bauxite: '', dev_material: '', improvement_material: ''
  });

  const [previousData, setPreviousData] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]); // 履歴用State
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
        <div key={item.id} style={{ borderBottom: '1px solid #ccc', marginBottom: '10px' }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>{item.date}</p>
          <p style={{ margin: '0', fontSize: '0.9em' }}>
            燃:{item.fuel} / 弾:{item.ammo} / 鋼:{item.steel} / ボ:{item.bauxite} / 開:{item.dev_material} /改:{item.improvement_material}
          </p>
        </div>
      ))}
    </div>

    <form onSubmit={handleSubmit} style={{ width: '300px'}}> 
      <h2>資源記録</h2>
      {/* 2. Object.entriesを使って、リストから名前を取り出して表示 */}
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
          {/* 追加：エラーがある場合メッセージを表示 */}
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
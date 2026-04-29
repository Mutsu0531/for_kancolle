import { useState } from 'react';
import { supabase } from './lib/supabaseClient';

function App() {
  const [formData, setFormData] = useState({
    fuel: '', ammo: '', steel: '', bauxite: '', dev_material: '', improvement_material: ''
  });

  // 追加：エラーメッセージを管理するState
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  // 1. 表示用の名前を定義するリスト
  const resourceLabels: { [key: string]: string } = {
    fuel: '燃料',
    ammo: '弾薬',
    steel: '鋼材',
    bauxite: 'ボーキサイト',
    dev_material: '開発資材',
    improvement_material: '改修資材'
  };

  /*const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: Number(value) });
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
    // 正常ならエラーを消す
    setErrors({ ...errors, [name]: null });
  }

  setFormData({ ...formData, [name]: numValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('resources').insert([
      { date: today, ...formData }
    ]);

    if (error) {
      alert('保存に失敗しました: ' + error.message);
    } else {
      alert('保存成功しました！');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
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
            placeholder="0"
          />
          {/* 追加：エラーがある場合メッセージを表示 */}
          {errors[key] && (
            <p style={{ color: 'red', fontSize: '12px', margin: '0' }}>{errors[key]}</p>
          )}
        </div>
      ))}
      <button type="submit">保存する</button>
    </form>
  );
}

export default App;
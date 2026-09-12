import { useEffect, useState } from 'react';
import { api } from "@/lib/api";
function useLoad(path) {
  const [data, setData] = useState(null),
    [error, setError] = useState('');
  async function reload() {
    try {
      setError('');
      setData(await api(path));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    api(path).then(d => {
      if (active) setData(d);
    }).catch(e => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [path]);
  return {
    data,
    error,
    reload
  };
}
export default useLoad;

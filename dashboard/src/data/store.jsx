import { createContext, useContext, useEffect, useMemo, useState } from "react";

// O dashboard lê UM json agregado gerado pelo pipeline Python
// (src/pipeline/build_dashboard_data.py). Ele é buscado em tempo de execução,
// então atualizar os dados com um ano novo não exige recompilar o app.
const DATA_URL = "./data/pescar.json";

const DataCtx = createContext(null);
const FilterCtx = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setErro(String(e)));
  }, []);
  return <DataCtx.Provider value={{ data, erro }}>{children}</DataCtx.Provider>;
}

export const useDataState = () => useContext(DataCtx);
export const useData = () => useContext(DataCtx).data;

// Filtros globais (visões coordenadas): o ano e a unidade em foco valem para
// todas as abas, então selecionar uma unidade num gráfico a destaca nos demais.
export function FilterProvider({ children }) {
  const [ano, setAno] = useState(0);        // 0 = todos os anos
  const [foco, setFoco] = useState(null);   // id da unidade em destaque
  const value = useMemo(() => ({
    ano, setAno, foco,
    setFoco: id => setFoco(f => (f === id ? null : id)),
    limparFoco: () => setFoco(null),
  }), [ano, foco]);
  return <FilterCtx.Provider value={value}>{children}</FilterCtx.Provider>;
}

export const useFilters = () => useContext(FilterCtx);

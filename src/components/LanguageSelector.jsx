import { LANGUAGES } from '../constants/languages.js';

export default function LanguageSelector({ value, onChange, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.label} ({lang.nativeLabel})
          </option>
        ))}
      </select>
    </label>
  );
}

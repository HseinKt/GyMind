import { useCallback, useEffect, useId, useRef, useState } from "react";
import { lookupsApi } from "../api/lookupsApi";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

function toCityObject(result) {
  const address = result.address ?? {};
  const name =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    result.name ||
    "";
  const country = address.country ?? "";

  return {
    name,
    country,
    lat: Number.parseFloat(result.lat),
    lon: Number.parseFloat(result.lon),
  };
}

export function formatCityLabel(city) {
  if (city.country) return `${city.name}, ${city.country}`;
  return city.name;
}

function suggestionLabel(result) {
  const city = toCityObject(result);
  if (city.name && city.country) return `${city.name}, ${city.country}`;
  return result.display_name ?? city.name;
}

export function CityAutocomplete({
  onCitySelect,
  label = "City",
  placeholder = "Search for a city…",
  initialDisplayValue = "",
  error = "",
  disabled = false,
  id: idProp,
}) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const rootRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const selectedSnapshotRef = useRef("");

  const [inputValue, setInputValue] = useState(initialDisplayValue);
  const [isSelected, setIsSelected] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const clearSelection = useCallback(() => {
    setIsSelected(false);
    selectedSnapshotRef.current = "";
    onCitySelect(null);
  }, [onCitySelect]);

  const applySelection = useCallback(
    (city, displayText) => {
      setInputValue(displayText);
      selectedSnapshotRef.current = displayText;
      setIsSelected(true);
      setOpen(false);
      setSuggestions([]);
      setHasSearched(false);
      setFetchError(false);
      onCitySelect(city);
    },
    [onCitySelect],
  );

  useEffect(() => {
    setInputValue(initialDisplayValue);
    setIsSelected(false);
    selectedSnapshotRef.current = "";
  }, [initialDisplayValue]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const query = inputValue.trim();

    if (isSelected || query.length < MIN_QUERY_LENGTH) {
      setLoading(false);
      setSuggestions([]);
      setFetchError(false);
      setHasSearched(false);
      return undefined;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setFetchError(false);
      setOpen(true);
      setHasSearched(false);

      try {
        const data = await lookupsApi.searchCities(query, controller.signal);
        if (controller.signal.aborted) return;

        setSuggestions(Array.isArray(data) ? data : []);
        setHasSearched(true);
      } catch (err) {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        setSuggestions([]);
        setFetchError(true);
        setHasSearched(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [inputValue, isSelected]);

  function handleInputChange(event) {
    const nextValue = event.target.value;
    setInputValue(nextValue);

    if (isSelected && nextValue !== selectedSnapshotRef.current) {
      clearSelection();
    }

    if (!nextValue.trim()) {
      clearSelection();
      setOpen(false);
      setSuggestions([]);
      setHasSearched(false);
      setFetchError(false);
    }
  }

  function handleSelect(result) {
    const city = toCityObject(result);
    if (!city.name || Number.isNaN(city.lat) || Number.isNaN(city.lon)) return;
    applySelection(city, formatCityLabel(city));
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  const showDropdown = open && !isSelected && inputValue.trim().length >= MIN_QUERY_LENGTH;
  const inputBorderClass = error
    ? "border-red-300 focus:border-red-400"
    : isSelected
      ? "border-emerald-300 focus:border-emerald-400"
      : "border-forge-border";

  return (
    <div ref={rootRef} className="relative grid gap-1">
      <label htmlFor={inputId} className="text-sm font-bold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => {
            if (!isSelected && inputValue.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`focus-ring w-full rounded-lg border bg-white px-3 py-2 text-sm ${inputBorderClass}`}
        />

        {showDropdown ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-forge-border bg-white py-1 shadow-panel"
          >
            {loading ? (
              <li className="px-3 py-2 text-sm font-semibold text-forge-muted" role="presentation">
                Searching…
              </li>
            ) : null}

            {!loading && fetchError ? (
              <li className="px-3 py-2 text-sm font-semibold text-red-600" role="presentation">
                Unable to load city suggestions. Check your connection and try again.
              </li>
            ) : null}

            {!loading && !fetchError && hasSearched && suggestions.length === 0 ? (
              <li className="px-3 py-2 text-sm font-semibold text-forge-muted" role="presentation">
                No cities found
              </li>
            ) : null}

            {!loading && !fetchError
              ? suggestions.map((result) => (
                  <li key={result.place_id} role="option">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(result)}
                    >
                      {suggestionLabel(result)}
                    </button>
                  </li>
                ))
              : null}
          </ul>
        ) : null}
      </div>

      {isSelected ? (
        <p className="text-xs font-semibold text-emerald-700">City selected</p>
      ) : null}

      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

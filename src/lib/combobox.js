// Combobox con ricerca: digitando si filtra la lista, la scelta avviene
// solo cliccando (o Invio su) una voce - non e' possibile confermare testo
// libero ne' creare voci nuove. Al blur, se il testo digitato non
// corrisponde esattamente a una delle opzioni consentite, il campo si
// svuota - cosi' un valore "a meta'" non puo' mai finire salvato per
// sbaglio. Usato per vincolare la categoria dei movimenti carta alla
// tassonomia canonica (vedi categories.js) senza toccare lo schema
// Supabase: il vincolo e' solo qui, lato UI.
//
// input: il campo di testo visibile. hiddenInput: dove finisce il valore
// confermato (quello letto da onSubmit). list: il <ul> del dropdown.
export function initCombobox({ input, hiddenInput, list, options }) {
  let filtered = [];
  let activeIndex = -1;

  function renderList(query) {
    const q = query.trim().toLowerCase();
    filtered = q ? options.filter(o => o.toLowerCase().includes(q)) : options;
    activeIndex = -1;
    list.innerHTML = filtered.length
      ? filtered.map((o, i) => `<li data-index="${i}">${o}</li>`).join("")
      : `<li class="combobox-empty">Nessuna categoria trovata</li>`;
    list.classList.add("open");
  }

  function closeList() {
    list.classList.remove("open");
    activeIndex = -1;
  }

  function selectOption(value) {
    input.value = value;
    hiddenInput.value = value;
    closeList();
  }

  function setActive(index) {
    activeIndex = index;
    [...list.children].forEach((li, i) => li.classList.toggle("active", i === activeIndex));
    list.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("input", () => {
    // Finche' il testo digitato non e' stato confermato scegliendo una
    // voce, non c'e' nessuna categoria valida selezionata.
    hiddenInput.value = "";
    renderList(input.value);
  });
  input.addEventListener("keydown", event => {
    if (!list.classList.contains("open")) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(activeIndex + 1, filtered.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    else if (event.key === "Enter") { if (activeIndex >= 0) { event.preventDefault(); selectOption(filtered[activeIndex]); } }
    else if (event.key === "Escape") { closeList(); }
  });
  list.addEventListener("mousedown", event => {
    const li = event.target.closest("li[data-index]");
    if (!li) return;
    event.preventDefault(); // evita che il blur dell'input scatti prima del click
    selectOption(filtered[Number(li.dataset.index)]);
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!options.includes(input.value)) {
        input.value = "";
        hiddenInput.value = "";
      }
      closeList();
    }, 150);
  });

  return {
    // Imposta il valore da fuori (es. onEdit/resetForm). Se il valore non
    // e' tra le opzioni consentite (es. una categoria storica ormai fuori
    // tassonomia), viene mostrato in chiaro nel campo ma NON confermato -
    // l'utente deve cercare e scegliere una categoria valida per poterla
    // salvare, invece di lasciare in giro un valore che il resto dell'app
    // non riconosce piu'.
    setValue(value) {
      input.value = value || "";
      hiddenInput.value = value && options.includes(value) ? value : "";
    },
  };
}

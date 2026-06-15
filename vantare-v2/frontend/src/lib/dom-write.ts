const htmlCache = new WeakMap<HTMLElement, string>();

export function setTextIfChanged(el: HTMLElement, value: string) {
  if (el.textContent !== value) {
    el.textContent = value;
  }
}

export function setClassNameIfChanged(el: HTMLElement, value: string) {
  if (el.className !== value) {
    el.className = value;
  }
}

export function setHTMLIfChanged(el: HTMLElement, value: string) {
  const last = htmlCache.get(el);
  if (last !== value) {
    el.innerHTML = value;
    htmlCache.set(el, value);
  }
}

export function setStylePropertyIfChanged(
  el: HTMLElement,
  prop: string,
  value: string,
) {
  if (el.style.getPropertyValue(prop) !== value) {
    el.style.setProperty(prop, value);
  }
}

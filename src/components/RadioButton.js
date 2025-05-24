export class RadioButton {
  constructor(name, value, handleRadioChange) {
    this.id = `surface-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    this.name = name;
    this.value = value;
    this.radio = document.createElement('input');
    this.radio.type = 'radio';
    this.radio.id = this.id;
    this.radio.name = this.name;
    this.radio.value = this.value;
    this.label = document.createElement('label');
    this.label.className = 'std-text';
    this.label.htmlFor = this.id;
    this.label.textContent = this.value;
    this.radio.addEventListener('change', handleRadioChange);
  }
  appendTo(container) {
    container.appendChild(this.radio);
    container.appendChild(this.label);
  }
  check() {
    this.radio.checked = true;
  }
  uncheck() {
    this.radio.checked = false;
  }
  isChecked() {
    return this.radio.checked;
  }
}

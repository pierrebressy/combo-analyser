export class TabsManager {
  constructor(main_container, tab_active) {
    this.main_container = main_container;
    this.tab_active = tab_active;
    this.tabs = [];

    this.tabs_selector_container = document.createElement('div');
    this.tabs_selector_container.classList.add('tabs-selector-container');
    this.tabs_selector_container.id = 'tabs-selector-container';
    this.main_container.appendChild(this.tabs_selector_container);

    this.tab_container = document.createElement('div');
    this.tab_container.classList.add('tab-container');
    this.tab_container.id = 'tab-container';
    this.main_container.appendChild(this.tab_container);

  }

  add_tab(tab_name, tab_class_name, class_name, callback) {
    this.add_tab_selector(tab_name, tab_class_name, callback);
    let tab_container = this.add_tab_container(tab_name, class_name);
    this.tabs.push({
      name: tab_name,
      document_name: '.' + class_name,
      tab_class_name: tab_class_name,
      class_name: class_name,
      callback: callback
    });
    return tab_container;
  }

  deactivate_tabs() {
    this.tabs.forEach(tab => {
      document.querySelectorAll(tab.document_name).forEach(tab => {
        tab.classList.add('hidden');
      });
    });

    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });

  }

  activate_tab(tab_name) {
    this.tab_active = tab_name;
    this.tabs.forEach(tab => {
      if (tab.tab_class_name === tab_name) {
        document.querySelectorAll(tab.document_name).forEach(tab => {
          tab.classList.remove('hidden');
        });
      }
    });
  }







  add_tab_selector(tab_name, class_name, callback) {
    const button = document.createElement('button');
    button.classList.add('tab-button');
    if (this.tab_active === tab_name) {
      button.classList.add('active');
    }
    button.textContent = tab_name;
    button.onclick = () => this.showTab(button, class_name, callback);
    this.tabs_selector_container.appendChild(button);
  }
  add_tab_container(tab_name, class_name) {
    let container = document.createElement('div');
    container.classList.add(class_name);
    container.classList.add('hidden');
    container.id = class_name;
    let heading = document.createElement('h2');
    heading.classList.add('std-text');
    heading.textContent = tab_name;
    let paragraph = document.createElement('p');
    paragraph.classList.add('std-text');
    paragraph.textContent = 'Here goes your content.';
    //container.appendChild(heading);
    //container.appendChild(paragraph);
    if (this.tab_active === tab_name) {
      container.classList.remove('hidden');
    }

    this.tab_container.appendChild(container);
    return container;
  }

  showTab(button, tabId, callback) {

    this.deactivate_tabs();
    this.activate_tab(tabId);

    // Highlight the selected button
    button.classList.add('active');

    // Optional callback
    if (typeof callback === 'function') {
        callback(tabId);
    }
    return;
}

}


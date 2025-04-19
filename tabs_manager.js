import { setCookie, getCookie } from "./network.js"


export class TabsManager {
  constructor(main_container, manager_name) {

    this.main_container = main_container;
    this.selectors = [];
    this.containers = [];
    this.manager_name = manager_name;

    this.tabs_selector_container = document.createElement('div');
    this.tabs_selector_container.classList.add('tabs-selector-container');
    this.tabs_selector_container.id = manager_name + '-tabs-selector-container';
    this.main_container.appendChild(this.tabs_selector_container);

    this.tab_container = document.createElement('div');
    this.tab_container.classList.add('tab-container');
    this.tab_container.id = 'tab-container';
    this.main_container.appendChild(this.tab_container);

  }

  add_tab(tab_label, tab_name, callback, params) {
    const tab_class_name = tab_name + '-tab-container';
    const class_name = tab_name + '-container';
    let selector = this.add_tab_selector(tab_label, tab_class_name, callback, params);
    this.selectors.push({
      selector: selector,
      name: tab_label,
      document_name: '.' + class_name,
      tab_class_name: tab_class_name,
      class_name: class_name,
      callback: callback,
      params: params
    });
    let tab_container = this.add_tab_container(tab_label, class_name);
    this.containers.push({
      container: tab_container,
      name: tab_label,
      document_name: '.' + class_name,
      tab_class_name: tab_class_name,
      class_name: class_name,
      callback: callback,
      params: params
    });
    return tab_container;
  }

  activate_tab(selector_name) {
    this.selectors.forEach(selector => {
      if (selector.name === selector_name) {
        selector.selector.classList.add('active');
        setCookie(this.manager_name, selector_name, 7);
      }
      else {
        selector.selector.classList.remove('active');
      }
    });
    this.containers.forEach(container => {
      if (container.name === selector_name) {
        container.container.classList.remove('hidden');
      }
      else {
        container.container.classList.add('hidden');
      }
    }
    );
  }

  get_last_active_tab() {
    //console.log("[get_last_active_tab]", this.manager_name);
    let last_active_tab = getCookie(this.manager_name);
    //console.log("[get_last_active_tab] last_active_tab=", last_active_tab);
    if (last_active_tab === undefined) {
      last_active_tab = this.selectors[0].name;
      setCookie(this.manager_name, last_active_tab, 7);
    }
    return last_active_tab;
  }

  activate_last_tab() {
    let last_active_tab = this.get_last_active_tab();
    this.activate_tab(last_active_tab);
  }

  add_tab_selector(tab_name, class_name, callback, params) {
    const button = document.createElement('button');
    button.classList.add('tab-button');
    // set the id with the tab_name chars from 0 too 8

    button.setAttribute("id", 'tab-button-' + tab_name.slice(0, 8));
    button.textContent = tab_name;
    button.onclick = () => this.showTab(button, class_name, tab_name, callback, params);
    this.tabs_selector_container.appendChild(button);
    return button;
  }

  add_tab_container(tab_name, class_name) {
    let container = document.createElement('div');
    container.classList.add(class_name);
    container.classList.add('hidden');
    container.id = class_name;
    this.tab_container.appendChild(container);
    return container;
  }

  showTab(button, tabId, tab_name, callback, params) {
    this.activate_tab(tab_name);
    if (callback)
      callback(params);
    return;
  }

}


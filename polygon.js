export let polygon_container = null; 

export function add_polygon_container_in_tab_container(tab_container) {
  polygon_container = document.createElement('div');
  polygon_container.classList.add('polygon-container');
  polygon_container.id = 'polygon-container';

  // Create header container (for heading + button)
  const headerContainer = document.createElement('div');
  headerContainer.style.display = 'flex';
  headerContainer.style.justifyContent = 'space-between';
  headerContainer.style.alignItems = 'center';

  // Heading
  const heading = document.createElement('h2');
  heading.classList.add('std-text');
  heading.textContent = 'POLYGON.IO ❖';

  // Clear Button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Button Polygon';
  clearBtn.classList.add('clear-poly-btn');
  clearBtn.onclick = () => {
    // Remove all children except the headerContainer
    [...polygon_container.children].forEach(child => {
      if (child !== headerContainer) {
        polygon_container.removeChild(child);
      }
    });
  };

  // Assemble header
  headerContainer.appendChild(heading);
  headerContainer.appendChild(clearBtn);
  polygon_container.appendChild(headerContainer);

  // Optional placeholder paragraph
  const paragraph = document.createElement('p');
  paragraph.classList.add('std-text');
  paragraph.textContent = 'Here goes your content.';
  polygon_container.appendChild(paragraph);

  // Add to tab container
  tab_container.appendChild(polygon_container);
}


export function addPolygonLog(...args) {
  if (polygon_container === null) {
    //console.error("Log container is not initialized.");
    return;
  }

  //let isWarning = false;
  //if (typeof args[args.length - 1] === 'boolean') {
  //  isWarning = args.pop();
  //}
  let options = {};
  if (typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1])) {
    options = args.pop();
  }
  const isWarning = options.warning === true;
  const isError = options.error === true;
  const isBlinker = options.blink === true;

  const logMessage = document.createElement('div');
  logMessage.style.margin = '5px 0';
  //const bodyStyles = getComputedStyle(document.body);
  //const warningColor = bodyStyles.getPropertyValue('--log-warning').trim();
  //const defaultColor = bodyStyles.getPropertyValue('--log-default2').trim();
//  logMessage.style.color = isWarning ? warningColor : defaultColor;  // Optional: color warning logs

if(isError)
  logMessage.classList.add('log-line', 'error');
else if (isWarning)
    logMessage.classList.add('log-line', 'warn');

if (isBlinker) {
    logMessage.classList.add('log-line', 'blink');
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let caller = 'unknown';
  try {
    const err = new Error();
    const stackLines = err.stack.split('\n');
    if (stackLines.length >= 3) {
      const match = stackLines[2].match(/at\s+(.*)\s+\(/);  // Chrome
      if (match && match[1]) {
        caller = match[1];
      } else {
        // Fallback: Firefox-style stack
        caller = stackLines[2].trim();
      }
    }
  } catch (e) {
    // ignore
  }

  const msgSymbol = isError? '🛑' : isWarning ? ' ⚠️' : '';

  // Convert all arguments to strings (objects -> JSON)
  const formattedMessage = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Object with circular reference]';
      }
    }
    return String(arg);
  }).join(' ');  // Join with space, like console.log

  logMessage.textContent = `[${timestamp}] ${msgSymbol} ${formattedMessage}`;
  //logMessage.textContent = `${timestamp} [${caller}] ${formattedMessage}`;
  //logMessage.textContent = `[${timestamp}] ${formattedMessage}`;
  //logMessage.textContent = formattedMessage;
  
  polygon_container.appendChild(logMessage);
}
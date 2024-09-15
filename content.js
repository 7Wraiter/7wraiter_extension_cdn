let promptQueue = [];
let isProcessing = false;
let isAutomatedPrompt = false;
let automatedMessageIds = [];

let isFirstPrompt = true;

let currentPage = 1;
const pageSize = 12;

// Busca os prompts da API e os ordena por executions
function fetchPrompts(page = 1) {
  return new Promise((resolve, reject) => {
    if (page < currentPage) {
      console.log(`Página ${page} já foi carregada. Ignorando.`);
      resolve([]);
      return;
    }

    chrome.runtime.sendMessage({ action: "getPrompts", page: page }, response => {
      if (response && response.prompts) {
        console.log(`Recebidos prompts da página ${response.currentPage}`); // Para debug
        currentPage = response.currentPage;
        resolve(response.prompts);
      } else {
        reject('Falha ao buscar prompts');
      }
    });
  });
}

function loadMorePrompts() {
  currentPage++;
  console.log(`Carregando página ${currentPage}`);
  fetchPrompts(currentPage)
    .then(newPrompts => {
      const cardsContainer = document.querySelector('.prompt-cards-container');

      // Verificar a resposta do servidor
      if (newPrompts.response === "404") {
        // Mostrar o alerta
        alert("Não há mais prompts!");

        // Ocultar o botão "Carregar mais"
        const loadMoreButton = document.getElementById('load-more-button');
        if (loadMoreButton) {
          loadMoreButton.style.display = 'none';
        }
      } else {
        // Renderizar os novos prompts
        renderPromptCards(newPrompts, cardsContainer, true);

        // Atualizar o texto do botão "Carregar mais"
        const loadMoreButton = document.getElementById('load-more-button');
        if (loadMoreButton) {
          loadMoreButton.textContent = `Carregar mais`;
        }
      }
    })
    .catch(error => {
      console.error('Erro ao carregar mais prompts:', error);
    });
}

// Cria a biblioteca de prompts na interface
function createPromptLibrary() {
  const existingLibrary = document.getElementById('prompt-library');
  if (existingLibrary) return;

  const libraryContainer = document.createElement('div');
  libraryContainer.id = 'prompt-library';
  libraryContainer.classList.add('prompt-library');

  const libraryTabs = document.createElement('div');
  libraryTabs.className = 'prompt-tabs';
  libraryTabs.innerHTML = `
  <div class="prompt-tab" data-type="favorites">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path></svg>
      <span>Favoritos</span>
    </div>
    <div class="prompt-tab active" data-type="own">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z"></path></svg>
      <span>7wrAIter</span>
    </div>
    <div class="prompt-tab" data-type="public">Comunidade</div>
    <div class="prompt-tab" data-type="all">Todos</div>
    <div class="prompt-tab add-prompt">Adicionar Prompt</div>
  `;

  const libraryLogo = document.createElement('div');
  libraryLogo.className = 'prompt-library-logo';
  libraryLogo.innerHTML = `
    <img src="https://7wraiter-assets.vercel.app/logo.webp" alt="Logo" width="120">
  `;

  const libraryHeader = document.createElement('div');
  libraryHeader.className = 'prompt-library-header';

  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';

  const searchLabel = document.createElement('span');
  searchLabel.textContent = 'Pesquisar';
  searchLabel.style.fontWeight = '600';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Buscar prompts...';
  searchInput.id = 'prompt-search-input';

  const categoryContainer = document.createElement('div');
  categoryContainer.className = 'category-container';

  const categoryLabel = document.createElement('span');
  categoryLabel.textContent = 'Categorias';
  categoryLabel.style.fontWeight = '600';

  const categoryFilter = document.createElement('select');
  categoryFilter.className = 'category-filter';
  categoryFilter.innerHTML = '<option value="">Todas as categorias</option>';

  const subCategoryContainer = document.createElement('div');
  subCategoryContainer.className = 'subcategory-container';

  const subCategoryLabel = document.createElement('span');
  subCategoryLabel.textContent = 'Subcategorias';
  subCategoryLabel.style.fontWeight = '600';

  const subCategoryFilter = document.createElement('select');
  subCategoryFilter.className = 'subcategory-filter';
  subCategoryFilter.innerHTML = '<option value="">Todas as subcategorias</option>';


  categoryContainer.appendChild(categoryLabel);
  categoryContainer.appendChild(categoryFilter);

  subCategoryContainer.appendChild(subCategoryLabel);
  subCategoryContainer.appendChild(subCategoryFilter);

  searchContainer.appendChild(searchLabel);
  searchContainer.appendChild(searchInput);

  libraryHeader.appendChild(categoryContainer);
  libraryHeader.appendChild(subCategoryContainer);
  libraryHeader.appendChild(searchContainer);
  libraryContainer.appendChild(libraryLogo);
  libraryContainer.appendChild(libraryTabs);
  libraryContainer.appendChild(libraryHeader);

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'prompt-cards-container';
  libraryContainer.appendChild(cardsContainer);


  const loadMoreButtonContainer = document.createElement('div');
  loadMoreButtonContainer.className = 'load-more-button-container';

  const loadMoreButton = document.createElement('button');
  loadMoreButton.id = 'load-more-button';
  loadMoreButton.style.display = 'none';
  loadMoreButton.textContent = 'Carregar mais';
  loadMoreButton.addEventListener('click', loadMorePrompts);
  loadMoreButtonContainer.appendChild(loadMoreButton);

  libraryContainer.appendChild(loadMoreButtonContainer);


  document.body.appendChild(libraryContainer);

  fetchPrompts(1).then(prompts => {
    renderPromptCards(prompts, cardsContainer);

    const categories = new Set();
    prompts.forEach(prompt => {
      prompt.categoria.forEach(cat => categories.add(cat.value));
    });

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = capitalizeFirstLetter(category);
      categoryFilter.appendChild(option);
    });

    const subCategories = new Set();
    prompts.forEach(prompt => {
      prompt['sub-categoria'].forEach(cat => subCategories.add(cat.value));
    });

    subCategories.forEach(subCategory => {
      const option = document.createElement('option');
      option.value = subCategory;
      option.textContent = capitalizeFirstLetter(subCategory);
      subCategoryFilter.appendChild(option);
    });

    // Função de filtro geral
    const filterPrompts = () => {
      const selectedCategory = categoryFilter.value;
      const selectedSubCategory = subCategoryFilter.value;
      const searchText = searchInput.value.toLowerCase();
      const selectedType = document.querySelector('.prompt-tab.active').dataset.type;

      const filteredPrompts = prompts.filter(prompt => {
        const matchesCategory = selectedCategory ? prompt.categoria.some(cat => cat.value === selectedCategory) : true;
        const matchesSubCategory = selectedSubCategory ? prompt['sub-categoria'].some(cat => cat.value === selectedSubCategory) : true;
        const matchesSearch = prompt.name.toLowerCase().includes(searchText) || prompt.categoria.some(cat => cat.value.toLowerCase().includes(searchText));
        const matchesType = selectedType === 'all' ? true : selectedType === 'public' ? prompt.comunidade : selectedType === 'favorites' ? prompt.favorite : !prompt.comunidade;



        return matchesCategory && matchesSubCategory && matchesSearch && matchesType;
      });

      renderPromptCards(filteredPrompts, cardsContainer);
    };

    filterPrompts();

    categoryFilter.addEventListener('change', filterPrompts);
    subCategoryFilter.addEventListener('change', filterPrompts);
    searchInput.addEventListener('input', filterPrompts);

    const handleLoadMore = async () => {
      currentPage += 1;
      console.log('clicou')
      await fetchPrompts();
    };

    document.getElementById('load-more-button').addEventListener('click', handleLoadMore);

    libraryTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.prompt-tab');
      if (tab) {
        document.querySelectorAll('.prompt-tab').forEach(tab => tab.classList.remove('active'));
        tab.classList.add('active');
        currentPage = 1;
        const selectedType = tab.dataset.type;

        if (selectedType === 'all' || selectedType === 'public') {
          document.getElementById('load-more-button').style.display = 'block';
        } else {
          document.getElementById('load-more-button').style.display = 'none';
        }
        filterPrompts();

      }
    });

    // Set initial tab as 'All'
    document.querySelector('.prompt-tab[data-type="own"]').classList.add('active');
  });

  libraryTabs.querySelector('.add-prompt').addEventListener('click', openAddPromptPopup);

}

function openAddPromptPopup() {
  chrome.runtime.sendMessage({ action: "openAddPromptPopup" });
}


function renderPromptCards(prompts, container, append = false) {
  if (!append) {
    container.innerHTML = '';
  }

  prompts.forEach((prompt) => {
    const promptCard = document.createElement('div');
    promptCard.className = 'prompt-card';

    const title = document.createElement('h3');
    title.textContent = prompt.name;
    promptCard.appendChild(title);

    if (prompt.description) {
      const description = document.createElement('p');
      description.textContent = prompt.description;
      promptCard.appendChild(description);
    }

    if (prompt.comunidade) {
      const comunidade = document.createElement('div');
      comunidade.className = 'tag-comunidade'
      comunidade.textContent = 'Comunidade'
      promptCard.appendChild(comunidade);
    }

    const footer = document.createElement('div');
    footer.className = 'prompt-card-footer';

    const statsContainer = document.createElement('div');
    statsContainer.className = 'prompt-stats';

    // Adiciona o ícone de olho (views)
    const views = document.createElement('div');
    views.className = 'prompt-views';
    views.innerHTML = `
      <svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
        <path fill="#888888" d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/>
      </svg>
      ${prompt.views || 0}
    `;

    // Adiciona o ícone de raio (executions)
    const executions = document.createElement('div');
    executions.className = 'prompt-executions';
    executions.innerHTML = `
      <svg class="lightning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
        <path fill="#888888" d="M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z"/>
      </svg>
      ${prompt.executions || 0}
    `;

    const favorite = document.createElement('div');
    favorite.className = 'prompt-favorite';
    favorite.innerHTML = `
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z"></path></svg>
    `;
    if (prompt.favorite) {
      favorite.classList.add('favorited')
    }

    statsContainer.appendChild(views);
    statsContainer.appendChild(executions);
    statsContainer.appendChild(favorite);
    footer.appendChild(statsContainer);

    const categories = document.createElement('div');
    categories.className = 'prompt-categories';
    prompt.categoria.forEach(cat => {
      const category = document.createElement('span');
      category.className = 'prompt-category';
      category.textContent = capitalizeFirstLetter(cat.value);
      category.style.backgroundColor = cat.color;
      categories.appendChild(category);
    });
    footer.appendChild(categories);

    promptCard.appendChild(footer);

    promptCard.addEventListener('click', () => {
      sendPromptUsageData(prompt.id);
      openPromptPopup(prompt);
    });

    container.appendChild(promptCard);

    favorite.addEventListener('click', async (event) => {
      event.stopPropagation();

      const token = await getVerificationToken();
      const promptName = prompt.name;
      const isFavorited = favorite.classList.contains('favorited');
      const url = 'https://api.7wraiter.co/webhook/7e085a9a-e24a-4c3a-b98c-e3a488fb70dd';
      const method = isFavorited ? 'DELETE' : 'POST'; 

      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: token,
            name: promptName
          })
        });

        if (response.ok) {
          favorite.classList.toggle('favorited'); 
        } else {
          console.error(`Erro ao ${isFavorited ? 'remover' : 'adicionar'} favorito:`, response.status);
        }
      } catch (error) {
        console.error(`Erro ao ${isFavorited ? 'remover' : 'adicionar'} favorito:`, error);
      }
    });

  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Função para fechar a biblioteca
function closePromptLibrary() {
  const libraryContainer = document.getElementById('prompt-library');
  if (libraryContainer) {
    libraryContainer.style.display = 'none';
  }
}

// Função para mostrar a biblioteca
function showPromptLibrary() {
  const libraryContainer = document.getElementById('prompt-library');
  if (libraryContainer) {
    libraryContainer.style.display = 'block';
  } else {
    createPromptLibrary();
  }
}

// Função para enviar dados de uso do prompt
function sendPromptUsageData(promptId, action) {
  fetch('https://api.7wraiter.co/webhook/cf766280-9f7b-40de-829f-838f400f1f55', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      promptId: promptId,
      action: action,
      timestamp: new Date().toISOString()
    })
  })
    .then(response => response.json())
    .then(data => console.log('Dados de uso do prompt enviados:', data))
    .catch(error => console.error('Erro ao enviar dados de uso do prompt:', error));
}



// Abre o popup para preencher variáveis do prompt
function openPromptPopup(prompt) {
  // Cria o container principal
  const container = document.createElement('div');
  container.className = 'popup-container prompt-library-popup';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.zIndex = '10000';

  // Cria o backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'popup-backdrop';
  backdrop.style.position = 'absolute';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.width = '100%';
  backdrop.style.height = '100%';
  backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

  // Cria o popup
  const popupContainer = document.createElement('div');
  popupContainer.className = 'prompt-popup';
  popupContainer.style.position = 'relative';
  popupContainer.style.zIndex = '1';

  const closeButton = document.createElement('button');
  closeButton.className = 'close-button';
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.fontSize = '24px';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = 'var(--text-primary)';
  closeButton.style.cursor = 'pointer';

  const title = document.createElement('h2');
  title.textContent = prompt.name;

  const description = document.createElement('p');
  if (prompt.description) {
    description.textContent = prompt.description;
    description.style.marginBottom = '20px';
    description.style.color = 'var(--text-secondary)';
  }

  const form = document.createElement('form');
  const variables = extractVariables(prompt);

  variables.forEach(variable => {
    const label = document.createElement('label');
    label.textContent = variable.charAt(0).toUpperCase() + variable.slice(1) + ':';
    const input = document.createElement('input');
    input.type = 'text';
    input.name = variable;
    form.appendChild(label);
    form.appendChild(input);
  });

  const submitButton = document.createElement('button');
  submitButton.textContent = 'Iniciar';
  submitButton.type = 'submit';

  form.appendChild(submitButton);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    promptQueue = [];
    automatedMessageIds = [];

    // Envia os dados de uso do prompt
    sendPromptUsageData(prompt.id, 'initiate');

    Object.keys(prompt).forEach(key => {
      if (key.startsWith('prompt_') && prompt[key]) {
        let promptText = prompt[key];
        for (let [key, value] of formData.entries()) {
          promptText = promptText.replace(`[${key}]`, value);
        }
        if (promptText.trim() !== '') {
          promptQueue.push(promptText);
        }
      }
    });

    closePopup();
    const libraryContainer = document.getElementById('prompt-library');
    if (libraryContainer) {
      libraryContainer.remove();
    }
    if (promptQueue.length > 0 && !isProcessing) {
      isProcessing = true;
      isAutomatedPrompt = true;
      hideTextarea();
      sendNextPrompt();
    }
  });

  popupContainer.appendChild(closeButton);
  popupContainer.appendChild(title);
  popupContainer.appendChild(description);
  popupContainer.appendChild(form);

  container.appendChild(backdrop);
  container.appendChild(popupContainer);
  document.body.appendChild(container);

  function closePopup() {
    container.remove();
  }

  closeButton.addEventListener('click', closePopup);
  backdrop.addEventListener('click', closePopup);
}

// obtem token no armazenamento local
function getVerificationToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token'], function (result) {
      resolve(result.token);
    });
  });
}

// Extrai variáveis do prompt
function extractVariables(prompt) {
  const variables = new Set();
  Object.keys(prompt).forEach(key => {
    if (key.startsWith('prompt_') && prompt[key]) {
      const matches = prompt[key].match(/\[([^\]]+)\]/g);
      if (matches) {
        matches.forEach(match => variables.add(match.slice(1, -1)));
      }
    }
  });
  return Array.from(variables);
}

// Oculta o textarea durante a automação
function hideTextarea() {
  const textarea = document.querySelector('#prompt-textarea');
  if (textarea) {
    textarea.style.opacity = '0';
  }
}

// Mostra o textarea após a automação
function showTextarea() {
  const textarea = document.querySelector('#prompt-textarea');
  if (textarea) {
    textarea.style.opacity = '1';
  }
}

function waitForSendButton(timeout = 90000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function checkButton() {
      const sendButton = document.querySelector('[data-testid="send-button"]');
      const isStreaming = document.querySelector('.result-streaming');

      if (sendButton && !isStreaming) {
        resolve(sendButton);
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Timeout waiting for send button'));
      } else {
        setTimeout(checkButton, 500); // Check every 500ms
      }
    }

    checkButton();
  });
}

// Envia o próximo prompt da fila
async function sendNextPrompt() {
    if (promptQueue.length === 0) {
        finishAutomation();
        return;
    }

    let prompt = promptQueue.shift();
    let tempMessage = createTemporaryMessage(prompt);
    document.body.appendChild(tempMessage);

    try {
        if (!isFirstPrompt) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Coloca o texto no textarea
        let textarea = document.querySelector("#prompt-textarea");
        
        // Cria um evento de input
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
        });

        // Define o valor e dispara o evento
        textarea.textContent = prompt;
        textarea.dispatchEvent(inputEvent);

        // Aguarda um curto período antes de tentar clicar no botão
        await new Promise(resolve => setTimeout(resolve, 500));

        // Tenta clicar no botão várias vezes
        let buttonClicked = false;
        for (let i = 0; i < 5; i++) {
            try {
                let sendButton = await waitForSendButton(8000);
                sendButton.click();
                buttonClicked = true;
                break;
            } catch (error) {
                console.log(`Tentativa ${i + 1} de clicar no botão falhou. Tentando novamente...`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (!buttonClicked) {
            throw new Error("Não foi possível clicar no botão após várias tentativas");
        }

        // Verifica se a mensagem foi enviada
        let messageSent = await waitForMessageSent();
        if (!messageSent) {
            throw new Error("A mensagem não foi enviada após clicar no botão");
        }

        await waitForNewMessage(tempMessage);
        await waitForResponse();
        isFirstPrompt = false;
        setTimeout(sendNextPrompt, 500);
    } catch (error) {
        console.error("Erro em sendNextPrompt:", error);
        isFirstPrompt = false;
        setTimeout(sendNextPrompt, 1000);
    }
}

// Nova função para verificar se a mensagem foi enviada
function waitForMessageSent() {
    return new Promise((resolve) => {
        let checkInterval = setInterval(() => {
            let userMessage = document.querySelector('[data-message-author-role="user"]:last-child');
            if (userMessage) {
                clearInterval(checkInterval);
                resolve(true);
            }
        }, 200);

        // Timeout após 5 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve(false);
        }, 5000);
    });
}

function createTemporaryMessage(messageContent) {
  const tempMessage = document.createElement('div');
  tempMessage.style.display = 'none'; // Oculta a mensagem
  tempMessage.textContent = messageContent;
  return tempMessage;
}

function sendMessage(messageContent) {
  const textarea = document.querySelector('#prompt-textarea');
  textarea.value = messageContent;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  const sendButton = document.querySelector('[data-testid="send-button"]');
  sendButton.click();
}

function waitForNewMessage(tempMessage) {
  const observer = new MutationObserver(() => {
    const newMessage = document.querySelector('[data-message-author-role="user"]:last-child');
    if (newMessage && newMessage.textContent.includes(tempMessage.textContent)) {
      // Nova mensagem encontrada, oculta a mensagem e remove o observador
      const messageId = newMessage.getAttribute('data-message-id');
      automatedMessageIds.push(messageId);
      hideUserMessage(messageId);
      obfuscatePromptContent(messageId);
      waitForResponse();
      observer.disconnect();
      tempMessage.remove();
    }
  });

  // Inicia a observação na árvore DOM
  observer.observe(document.body, { childList: true, subtree: true });
}

function waitForResponse() {
  return new Promise((resolve) => {
    const checkForResponse = () => {
      const lastMessage = document.querySelector('[data-message-author-role="assistant"]:last-child');
      if (lastMessage && !lastMessage.querySelector('.result-streaming')) {
        setTimeout(resolve, 500); // Wait an extra second after streaming ends
      } else {
        setTimeout(checkForResponse, 500);
      }
    };

    checkForResponse();
  });
}


function finishAutomation() {
  isProcessing = false;
  isAutomatedPrompt = false;
  showTextarea();
  removeHidingMechanism();
  checkUrlAndToggleButtons();
}

// Função para criar uma mensagem temporária e oculta
function createTemporaryMessage(messageContent) {
  const tempMessage = document.createElement('div');
  tempMessage.style.display = 'none'; // Oculta a mensagem
  tempMessage.textContent = messageContent;
  return tempMessage;
}

// Função para enviar a mensagem
function sendMessage(messageContent) {
  const textarea = document.querySelector('#prompt-textarea');
  textarea.value = messageContent;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  const sendButton = document.querySelector('[data-testid="send-button"]');
  sendButton.click();
}

// Aguarda a nova mensagem do usuário e oculta
function waitForNewMessage(tempMessage) {
  const observer = new MutationObserver(() => {
    const newMessage = document.querySelector('[data-message-author-role="user"]:last-child');
    if (newMessage && newMessage.textContent.includes(tempMessage.textContent)) {
      // Nova mensagem encontrada, oculta a mensagem e remove o observador
      const messageId = newMessage.getAttribute('data-message-id');
      automatedMessageIds.push(messageId);
      hideUserMessage(messageId);
      obfuscatePromptContent(messageId);
      waitForResponse();
      observer.disconnect();
      tempMessage.remove();
    }
  });

  // Inicia a observação na árvore DOM
  observer.observe(document.body, { childList: true, subtree: true });
}


// Oculta mensagem do usuário pelo ID
function hideUserMessage(messageId) {
  const message = document.querySelector(`[data-message-id="${messageId}"]`);
  if (message) {
    message.style.display = 'none';

    // Adiciona indicador de mensagem oculta
    if (!message.nextElementSibling || !message.nextElementSibling.classList.contains('hidden-message-indicator')) {
      const indicator = document.createElement('div');
      indicator.textContent = 'Mensagem oculta (automação)';
      indicator.className = 'hidden-message-indicator';
      indicator.style.backgroundColor = '#f0f0f0';
      indicator.style.padding = '10px';
      indicator.style.borderRadius = '5px';
      indicator.style.marginBottom = '10px';
      message.parentNode.insertBefore(indicator, message.nextSibling);
    }
  }
}

// Ofusca o conteúdo do prompt no DOM
function obfuscatePromptContent(messageId) {
  const message = document.querySelector(`[data-message-id="${messageId}"]`);
  if (message) {
    const contentDiv = message.querySelector('div > div');
    if (contentDiv) {
      contentDiv.textContent = '[Conteúdo do prompt oculto]';
    }
  }
}


// Finaliza a automação
function finishAutomation() {
  isProcessing = false;
  isAutomatedPrompt = false;
  showTextarea();
  removeHidingMechanism();
  // createActionButtons(); // Adicione esta linha
}

// Remove o mecanismo de ocultação
function removeHidingMechanism() {
  if (window.hidingObserver) {
    window.hidingObserver.disconnect();
    window.hidingObserver = null;
  }
}

// Inicializa o mecanismo de ocultação
function initializeHidingMechanism() {
  removeHidingMechanism(); // Remove qualquer observador existente

  window.hidingObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        automatedMessageIds.forEach(messageId => {
          hideUserMessage(messageId);
          obfuscatePromptContent(messageId);
        });
      }
    });
  });

  window.hidingObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Mantém as mensagens da automação ocultas e ofuscadas
function keepAutomatedMessagesHiddenAndObfuscated() {
  setInterval(() => {
    automatedMessageIds.forEach(messageId => {
      hideUserMessage(messageId);
      obfuscatePromptContent(messageId);
    });
  }, 1000); // Verifica a cada segundo
}

// Função para verificar a URL e mostrar a biblioteca se necessário
function checkURLAndShowLibrary() {
  if (!window.location.href('https://chatgpt.com/c/')) {
    showPromptLibrary();
  }
}

// Função para verificar a URL e fechar a biblioteca se necessário
function checkURLAndCloseLibrary() {
  const currentUrl = window.location.href;
  if (currentUrl.includes('https://chatgpt.com/c/') ||
    currentUrl.includes('https://chatgpt.com/gpts') ||
    currentUrl.includes('https://chatgpt.com/g/')) {
    closePromptLibrary();
  } else if (currentUrl === 'https://chatgpt.com/') {
    showPromptLibrary();
  }
}

function hideSpecificDivs() {
  const userDivs = document.querySelectorAll('div[data-message-author-role="user"]');

  userDivs.forEach(userDiv => {
    const innerDiv = Array.from(userDiv.querySelectorAll('div')).find(div => div.textContent.includes('tudo bem'));

    if (innerDiv) {
      innerDiv.textContent = '[Conteúdo do prompt oculto]'
      innerDiv.className = 'hidden-message-indicator';
    }
  });
}






function createActionButtons() {
  removeActionButtons(); // Remove botões existentes antes de criar novos

  const sidebar = document.querySelector('.flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary');

  if (!sidebar) {
    console.error('Sidebar não encontrada.');
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'action-button-container';

  const buttons = [
    { text: 'Continue', action: 'Please continue reply' },
    { text: 'Expanda', action: 'Please expand the copy' },
    { text: '+Persuação', action: 'Please take a breath and think carefully about how to make this copy even more persuasive, add more elements of persuasion and make it more irresistible and emotional' },
    { text: '+Credibilidade', action: 'Please, breathe and think carefully about how to add more evidence and make this copy more credible to the point that even the most skeptical person will believe it.' }
  ];

  buttons.forEach(button => {
    const btn = document.createElement('button');
    btn.textContent = button.text;
    btn.className = 'action-button';
    btn.addEventListener('click', () => sendAction(button.action));
    buttonContainer.appendChild(btn);
  });

  function adjustButtonContainerWidth() {
    const sidebarWidth = window.getComputedStyle(sidebar).width;

    if (sidebarWidth === '0px') {
      buttonContainer.style.width = '100%';
      buttonContainer.style.marginLeft = '0';
    } else {
      buttonContainer.style.width = `calc(100% - ${sidebarWidth})`;
      buttonContainer.style.marginLeft = `${sidebarWidth}`;
    }
  }

  // Initial adjustment
  adjustButtonContainerWidth();

  // Set up the MutationObserver to watch for changes in the sidebar
  const observer = new MutationObserver(() => {
    adjustButtonContainerWidth();
  });

  observer.observe(sidebar, { attributes: true, childList: true, subtree: true });

  document.body.appendChild(buttonContainer);
}

function removeActionButtons() {
  const existingContainer = document.querySelector('.action-button-container');
  if (existingContainer) {
    existingContainer.remove();
  }
}

function checkUrlAndToggleButtons() {
  if (window.location.href.includes('chatgpt.com/c/')) {
   // createActionButtons();
  } else {
    removeActionButtons();
  }
}

// Função para observar mudanças na URL
function observeUrlChanges() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      checkUrlAndToggleButtons();
    }
  }).observe(document, { subtree: true, childList: true });
}

// Inicializa a observação de mudanças na URL
observeUrlChanges();

// Verifica a URL inicial
checkUrlAndToggleButtons();

function sendAction(action) {
  const textarea = document.querySelector('#prompt-textarea');
  textarea.value = action;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  const sendButton = document.querySelector('[data-testid="send-button"]');
  sendButton.click();
}



// Inicializa as funcionalidades
setTimeout(hideSpecificDivs, 2000);
checkURLAndCloseLibrary();
initializeHidingMechanism();
keepAutomatedMessagesHiddenAndObfuscated();
// preventDevTools();



// Observa mudanças na URL
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkURLAndCloseLibrary();
  }
}).observe(document, { subtree: true, childList: true });





function adjustMainContentWidth() {
  const mainContent = document.querySelector('#prompt-library');
  const sidebar = document.querySelector('.flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary');

  if (!mainContent || !sidebar) {
    console.error('Elemento main-content ou sidebar não encontrado.');
    return;
  }

  const sidebarWidth = window.getComputedStyle(sidebar).width;
  if (sidebarWidth === '0px') {
    mainContent.style.width = '100%';
  } else {
    mainContent.style.width = `calc(100% - ${sidebarWidth})`;
  }
}

window.addEventListener('load', () => {
  // Initial adjustment
  adjustMainContentWidth();

  const sidebar = document.querySelector('.flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary');
  if (sidebar) {
    const observer = new MutationObserver(adjustMainContentWidth);
    observer.observe(sidebar, { attributes: true, childList: true, subtree: true });
  } else {
    console.error('Sidebar não encontrada.');
  }
});

function applySystemThemeToLibrary() {
  const htmlTag = document.querySelector('html');
  const libraryContainer = document.getElementById('prompt-library');


  if (htmlTag.classList.contains('dark')) {
    libraryContainer.classList.add('dark');
    libraryContainer.classList.remove('light');
  } else {
    libraryContainer.classList.add('light');
    libraryContainer.classList.remove('dark');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyThemeClass();

  const htmlTag = document.querySelector('html');
  
  const observer = new MutationObserver(() => {
    console.log('HTML class attribute changed');
    applyThemeClass();
  });

  observer.observe(htmlTag, { attributes: true, attributeFilter: ['class'] });
});
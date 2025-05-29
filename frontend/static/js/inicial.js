// Adicione estas funções auxiliares no início do arquivo
function formatarData(dataString) {
    if (!dataString) return 'Não definida';
    
    try {
        // Tenta converter para objeto Date
        const dataObj = new Date(dataString);
        
        // Verifica se é uma data válida
        if (isNaN(dataObj.getTime())) {
            throw new Error('Data inválida');
        }
        
        // Formata para o padrão brasileiro
        return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data:', error, 'Valor recebido:', dataString);
        return 'Data inválida';
    }
}

function parseISODate(dateString) {
    // Divide a string em partes
    const partes = dateString.split('T')[0].split('-');
    if (partes.length !== 3) return null;
    
    // Cria nova data no fuso horário local
    return new Date(
        parseInt(partes[0]), // ano
        parseInt(partes[1]) - 1, // mês (0-indexed)
        parseInt(partes[2]) // dia
    );
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('inicial.js: DOM Content Loaded. Iniciando...');
    // Chama a função para carregar o perfil do usuário logo no início
    await loadUserProfile(); // Carrega perfil primeiro, se necessário para UI
    await loadAndRenderTasks();

    const addTarefaBtn = document.getElementById('add-tarefa-btn');
    if (addTarefaBtn) {
        addTarefaBtn.addEventListener('click', () => {
            window.location.href = '/frontend/templates/criartarefa.html';
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
        });
    }

    document.querySelectorAll('.task-column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave);
    });
});

// Mapeamento de status (data-status das colunas) para IDs dos elementos de contador
const statusToCounterId = {
    'a fazer': 'todo-count',
    'fazendo': 'doing-count',
    'concluido': 'done-count'
};

// Mapeamento de status para IDs das listas de tarefas
const statusToTaskListId = {
    'a fazer': 'todo-tasks-list',
    'fazendo': 'doing-tasks-list',
    'concluido': 'done-tasks-list'
};


async function loadAndRenderTasks() {
    console.log('inicial.js: Carregando e renderizando tarefas...');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/tasks', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao carregar tarefas:', errorData.erro);
            alert(`Erro ao carregar tarefas: ${errorData.erro}.`);
            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
            }
            return;
        }

        const tasksByStatus = await response.json(); // Espera-se que tasks seja um objeto: {'a fazer': [], 'fazendo': [], 'concluido': []}
        console.log('Tarefas carregadas com sucesso:', tasksByStatus);

        // Limpa apenas os cards de tarefas existentes, preservando as mensagens de coluna vazia
        Object.values(statusToTaskListId).forEach(listId => {
            const taskList = document.getElementById(listId);
            if (taskList) {
                // Remove todos os filhos que são cards de tarefa
                taskList.querySelectorAll('.task-card').forEach(card => card.remove());
            }
        });

        // Renderiza tarefas
        if (tasksByStatus['a fazer']) {
            tasksByStatus['a fazer'].forEach(task => createTaskCard(task, statusToTaskListId['a fazer']));
        }
        if (tasksByStatus['fazendo']) {
            tasksByStatus['fazendo'].forEach(task => createTaskCard(task, statusToTaskListId['fazendo']));
        }
        if (tasksByStatus['concluido']) {
            tasksByStatus['concluido'].forEach(task => createTaskCard(task, statusToTaskListId['concluido']));
        }
        
        // Atualiza contadores e visibilidade das mensagens de coluna vazia
        updateTaskCounters();

    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        alert('Ocorreu um erro ao carregar suas tarefas.');
    }
}

// REMOVIDA: function showEmptyMessages(tasks) - agora é gerenciado por updateTaskCounters e HTML estático

function createTaskCard(task, columnListId) {
    const columnList = document.getElementById(columnListId);
    if (!columnList) {
        console.error(`Lista de coluna com ID ${columnListId} não encontrada.`);
        return;
    }

    const taskCard = document.createElement('div');
    taskCard.className = 'task-card bg-white rounded-lg shadow-md p-4 mb-3 cursor-grab';
    taskCard.setAttribute('draggable', 'true');
    taskCard.id = `task-${task.id}`;
    taskCard.dataset.taskId = task.id;

    let priorityClass = '';
    switch (task.prioridade) {
        case 'Alta': priorityClass = 'bg-red-200 text-red-800'; break;
        case 'Média': priorityClass = 'bg-yellow-200 text-yellow-800'; break;
        case 'Baixa': priorityClass = 'bg-green-200 text-green-800'; break;
        default: priorityClass = 'bg-gray-200 text-gray-800';
    }

    // Função auxiliar para formatar datas de forma segura
    const formatarData = (dataString) => {
        if (!dataString) return 'Não definida';
        
        try {
            // Extrai apenas a parte da data (ignora o tempo)
            const [dataPart] = dataString.split('T');
            const [ano, mes, dia] = dataPart.split('-').map(Number);
            
            // Verifica se os valores são válidos
            if (isNaN(ano) || isNaN(mes) || isNaN(dia)) {
                throw new Error('Valores numéricos inválidos');
            }
            
            // Formata para DD/MM/AAAA
            return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
        } catch (error) {
            console.error('Erro ao formatar data:', error, 'Valor recebido:', dataString);
            return 'Data inválida';
        }
    };

    const dueDate = formatarData(task.data_vencimento);

    taskCard.innerHTML = `
        <div class="task-header flex justify-between items-center mb-2">
            <h3 class="font-semibold text-gray-800 text-base">${task.titulo}</h3>
            <span class="priority text-xs font-bold px-2 py-1 rounded-full ${priorityClass}">${task.prioridade || 'N/A'}</span>
        </div>
        <p class="text-gray-600 text-sm mb-2">${task.descricao || 'Sem descrição'}</p>
        <div class="task-details text-gray-500 text-xs flex justify-between items-center mb-3">
            <span>Vencimento: ${dueDate}</span>
            ${task.projeto ? `<span>Projeto: ${task.projeto}</span>` : ''}
        </div>
        <div class="task-actions flex justify-end space-x-2">
             <button class="edit-btn bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-md" data-task-id="${task.id}">Editar</button>
             <button class="delete-btn bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-md" data-task-id="${task.id}">Excluir</button>
        </div>
    `;

    columnList.appendChild(taskCard);

    // Event listeners
    taskCard.addEventListener('dragstart', handleDragStart);
    taskCard.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        editTask(task.id);
    });
    taskCard.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });
}

let draggedItem = null; // Referência ao elemento sendo arrastado
let sourceColumnElement = null; // Referência ao elemento da coluna de origem

function handleDragStart(e) {
    draggedItem = e.target.closest('.task-card');
    if (draggedItem) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.id);
        sourceColumnElement = draggedItem.closest('.task-column'); // A coluna DOM de origem
        // Adiciona uma classe para feedback visual (opcional)
        draggedItem.classList.add('dragging');
        console.log('Drag iniciado da coluna:', sourceColumnElement.dataset.status, 'Task ID:', draggedItem.dataset.taskId);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const column = e.currentTarget.closest('.task-column');
    if (column) {
      column.classList.add('border-blue-400', 'border-2'); // Feedback visual na coluna de destino
    }
}

function handleDragLeave(e) {
    const column = e.currentTarget.closest('.task-column');
    if (column) {
      column.classList.remove('border-blue-400', 'border-2');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetColumnElement = e.currentTarget.closest('.task-column');
    targetColumnElement.classList.remove('border-blue-400', 'border-2');

    if (!draggedItem || !targetColumnElement) {
        if (draggedItem) draggedItem.classList.remove('dragging');
        draggedItem = null;
        sourceColumnElement = null;
        return;
    }
    
    const taskId = draggedItem.dataset.taskId;
    const newStatus = targetColumnElement.dataset.status;
    const originalStatus = sourceColumnElement.dataset.status;

    // Não faz nada se soltar na mesma coluna
    if (targetColumnElement === sourceColumnElement) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
        sourceColumnElement = null;
        return;
    }

    // 1. Movimento otimista - atualiza UI imediatamente
    const targetList = targetColumnElement.querySelector('.tasks-list');
    targetList.appendChild(draggedItem); // Move o elemento
    draggedItem.classList.remove('dragging');
    
    // 2. Atualizar contadores e mensagens de coluna vazia IMEDIATAMENTE
    updateTaskCounters();

    try {
        // 3. Atualizar backend
        await updateTaskStatus(taskId, newStatus);
        console.log(`Tarefa ${taskId} movida para ${newStatus} com sucesso no backend.`);
        // Sucesso, a UI já está correta.
    } catch (error) {
        console.error('Falha na atualização do status no backend:', error);
        
        // Reverter movimento no DOM em caso de erro no backend
        const originalList = sourceColumnElement.querySelector('.tasks-list');
        originalList.appendChild(draggedItem); // Devolve o item para a lista original
        
        // Atualizar contadores novamente para refletir o estado revertido
        updateTaskCounters();
        alert('Falha ao mover tarefa. A alteração foi desfeita.');
    } finally {
        // Limpa as variáveis de estado do drag
        draggedItem = null;
        sourceColumnElement = null;
    }
}

function updateTaskCounters() {
    console.log('Atualizando contadores...');
    Object.keys(statusToTaskListId).forEach(statusKey => { // 'a fazer', 'fazendo', 'concluido'
        const listId = statusToTaskListId[statusKey];
        const taskListElement = document.getElementById(listId);
        
        if (taskListElement) {
            const count = taskListElement.querySelectorAll('.task-card').length;
            const counterId = statusToCounterId[statusKey]; // 'todo-count', 'doing-count', 'done-count'
            const counterElement = document.getElementById(counterId);

            if (counterElement) {
                counterElement.textContent = `(${count})`;
            }

            const emptyMessageElement = taskListElement.querySelector('.empty-column-message');
            if (emptyMessageElement) {
                emptyMessageElement.style.display = count === 0 ? 'block' : 'none';
            }
        } else {
            console.warn(`Elemento da lista de tarefas não encontrado para status: ${statusKey} (ID: ${listId})`);
        }
    });
}


async function updateTaskStatus(taskId, newStatus) {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login.html';
        throw new Error('Token não encontrado'); // Lança erro para ser pego pelo catch no handleDrop
    }

    try {
        const response = await fetch(`http://localhost:5000/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao atualizar status no backend:', errorData);
            throw new Error(errorData.erro || 'Erro ao atualizar status da tarefa no servidor');
        }

        console.log(`Status da tarefa ${taskId} atualizado para ${newStatus} no backend.`);
        // Não precisa recarregar todas as tarefas aqui, a UI já foi atualizada otimisticamente.
    } catch (error) {
        console.error('Exceção em updateTaskStatus:', error);
        throw error; // Re-lança o erro para que handleDrop possa tratá-lo (reverter UI)
    }
}

function editTask(taskId) {
    console.log(`Editar tarefa com ID: ${taskId}`);
    window.location.href = `/frontend/templates/criartarefa.html?id=${taskId}`;
}

async function deleteTask(taskId) {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
        return;
    }

    const token = localStorage.getItem('jwt_token');
    if (!token) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.erro || 'Erro desconhecido ao deletar tarefa.');
        }

        alert('Tarefa excluída com sucesso!');
        // Remove o card da tarefa do DOM
        const taskCardElement = document.getElementById(`task-${taskId}`);
        if (taskCardElement) {
            taskCardElement.remove();
        }
        // Atualiza os contadores
        updateTaskCounters();
        // Não é necessário chamar loadAndRenderTasks() se a remoção do DOM e a atualização do contador forem suficientes
        // await loadAndRenderTasks(); // Recarrega tudo, pode ser evitado
    } catch (error) {
        console.error('inicial.js: Erro ao deletar tarefa:', error);
        alert(`Erro ao deletar tarefa: ${error.message}`);
    }
}

async function logout() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        try {
            await fetch('http://localhost:5000/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Logout do backend concluído.');
        } catch (error) {
            console.error('Erro ao chamar endpoint de logout:', error);
        } finally {
            localStorage.removeItem('jwt_token');
            alert('Você foi desconectado.');
            window.location.href = '/login.html';
        }
    } else {
        localStorage.removeItem('jwt_token'); // Garante que está limpo
        alert('Você já estava desconectado.');
        window.location.href = '/login.html';
    }
}

async function loadUserProfile() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.log('Nenhum token encontrado para carregar perfil.');
        // Se não há token e a página não é login.html, pode ser útil redirecionar
        // if (window.location.pathname !== '/login.html' && window.location.pathname !== '/frontend/templates/cadastro.html') {
        //     window.location.href = '/login.html';
        // }
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/perfil', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = userData.nome || 'Usuário';
                console.log('Nome do usuário no perfil atualizado:', userData.nome);
            }
        } else {
            const errorData = await response.json();
            console.error('Erro ao carregar perfil:', errorData.erro);
            if (response.status === 401 || response.status === 422) { // 422 Unprocessable Entity (token inválido)
                localStorage.removeItem('jwt_token');
                // Evita múltiplos alertas se loadAndRenderTasks também falhar por token
                if (window.location.pathname !== '/login.html') {
                     alert('Sua sessão expirou ou é inválida. Faça login novamente.');
                     window.location.href = '/login.html';
                }
            }
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar perfil:', error);
        // Em caso de falha de rede, pode não ser um problema de token
        // alert('Falha ao conectar com o servidor para carregar seu perfil.');
    }
}

// Removida a segunda chamada DOMContentLoaded para loadUserProfile, já está no início do primeiro.
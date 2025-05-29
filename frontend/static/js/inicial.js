// frontend/static/js/inicial.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('inicial.js: DOM Content Loaded. Iniciando...');

    // Assumimos que authChecker.js já foi carregado e está sendo executado.
    // Você pode chamar checkAuthentication() aqui se ele não for automaticamente chamado.
    // await checkAuthentication(); // Descomente se authChecker.js não estiver sendo incluído

    // Carregar e renderizar as tarefas assim que a página é carregada
    await loadAndRenderTasks();

    // Adiciona event listener para o botão de adicionar tarefa
    const addTarefaBtn = document.getElementById('add-tarefa-btn');
    if (addTarefaBtn) {
        addTarefaBtn.addEventListener('click', () => {
            window.location.href = '/frontend/templates/criartarefa.html'; // Garante o caminho correto
        });
    }

    // Adiciona event listener para o botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
        });
    }

    // Adiciona os event listeners de drop para as colunas (para Drag and Drop)
    document.querySelectorAll('.task-column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave); // Adicionado para feedback visual
    });
});

async function loadAndRenderTasks() {
    console.log('inicial.js: Carregando e renderizando tarefas...');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        console.error('inicial.js: Token JWT não encontrado. Redirecionando para login.');
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
            console.error('inicial.js: Erro ao carregar tarefas:', errorData.erro);
            alert(`Erro ao carregar tarefas: ${errorData.erro}. Por favor, tente novamente.`);
            // Se o erro for 401, a sessão pode ter expirado, então redirecione.
            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
            }
            return;
        }

        const tasks = await response.json();
        console.log('inicial.js: Tarefas carregadas com sucesso:', tasks);
        console.log(`inicial.js: Tarefas 'A Fazer' recebidas: ${tasks['a fazer'].length}`);
        console.log(`inicial.js: Tarefas 'Fazendo' recebidas: ${tasks['fazendo'].length}`);
        console.log(`inicial.js: Tarefas 'Concluído' recebidas: ${tasks['concluido'].length}`);


        // Limpa os contêineres de tarefas antes de renderizar novamente
        document.getElementById('todo-tasks-list').innerHTML = '';
        document.getElementById('doing-tasks-list').innerHTML = '';
        document.getElementById('done-tasks-list').innerHTML = '';

        // Oculta todas as mensagens de "Nenhuma tarefa" inicialmente
        document.querySelectorAll('.empty-column-message').forEach(el => el.style.display = 'none');

        // Renderiza as tarefas nas colunas apropriadas
        tasks['a fazer'].forEach(task => createTaskCard(task, 'todo-tasks-list'));
        tasks['fazendo'].forEach(task => createTaskCard(task, 'doing-tasks-list'));
        tasks['concluido'].forEach(task => createTaskCard(task, 'done-tasks-list'));

        // Atualiza os contadores de tarefas
        document.getElementById('todo-count').textContent = `(${tasks['a fazer'].length})`;
        document.getElementById('doing-count').textContent = `(${tasks['fazendo'].length})`;
        document.getElementById('done-count').textContent = `(${tasks['concluido'].length})`;

        // Mostra a mensagem de "Nenhuma tarefa" se a coluna estiver vazia
        if (tasks['a fazer'].length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'text-gray-500 text-sm italic empty-column-message';
            emptyMessage.textContent = 'Nenhuma tarefa para fazer.';
            document.getElementById('todo-tasks-list').appendChild(emptyMessage);
        }
        if (tasks['fazendo'].length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'text-gray-500 text-sm italic empty-column-message';
            emptyMessage.textContent = 'Nenhuma tarefa em andamento.';
            document.getElementById('doing-tasks-list').appendChild(emptyMessage);
        }
        if (tasks['concluido'].length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'text-gray-500 text-sm italic empty-column-message';
            emptyMessage.textContent = 'Nenhuma tarefa concluída.';
            document.getElementById('done-tasks-list').appendChild(emptyMessage);
        }


    } catch (error) {
        console.error('inicial.js: Erro na requisição para carregar tarefas:', error);
        alert('Ocorreu um erro ao carregar suas tarefas. Tente recarregar a página.');
    }
}

function createTaskCard(task, columnListId) {
    const columnList = document.getElementById(columnListId);
    if (!columnList) {
        console.error(`Contêiner de lista de tarefas com ID "${columnListId}" não encontrado.`);
        return;
    }

    const taskCard = document.createElement('div');
    taskCard.className = 'task-card bg-white rounded-lg shadow-md p-4 mb-3 cursor-grab'; // Adicionei classes de estilo e cursor
    taskCard.setAttribute('draggable', 'true');
    taskCard.id = `task-${task.id}`;

    let priorityClass = '';
    if (task.prioridade === 'Alta') {
        priorityClass = 'bg-red-200 text-red-800'; // Exemplo de classe Tailwind para alta prioridade
    } else if (task.prioridade === 'Média') {
        priorityClass = 'bg-yellow-200 text-yellow-800'; // Exemplo para média
    } else if (task.prioridade === 'Baixa') {
        priorityClass = 'bg-green-200 text-green-800'; // Exemplo para baixa
    }

    const dueDate = task.data_vencimento ? new Date(task.data_vencimento).toLocaleDateString('pt-BR') : 'Não definida';

    taskCard.innerHTML = `
        <div class="task-header flex justify-between items-center mb-2">
            <h3 class="font-semibold text-gray-800 text-base">${task.titulo}</h3>
            <span class="priority text-xs font-bold px-2 py-1 rounded-full ${priorityClass}">${task.prioridade}</span>
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

    // Adiciona event listeners para Drag and Drop
    taskCard.addEventListener('dragstart', handleDragStart);

    // Adiciona event listeners para botões de editar e excluir
    taskCard.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o evento de arrastar seja disparado ao clicar no botão
        editTask(task.id);
    });
    taskCard.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o evento de arrastar seja disparado ao clicar no botão
        deleteTask(task.id);
    });
}

// Funções para Drag and Drop
let currentDraggedTaskId = null; // Variável global para armazenar o ID da tarefa sendo arrastada

function handleDragStart(e) {
    // Garante que o item arrastado é o cartão da tarefa (o elemento com 'draggable="true"')
    const taskCard = e.target.closest('.task-card');
    if (taskCard) {
        currentDraggedTaskId = taskCard.id.replace('task-', ''); // Armazena apenas o ID numérico
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskCard.id); // Define o ID completo (ex: "task-123") para a transferência
        console.log('handleDragStart: Task ID sendo arrastado:', currentDraggedTaskId);
        console.log('handleDragStart: Dados definidos para dataTransfer:', taskCard.id);
    } else {
        // Se por algum motivo o .task-card não for encontrado, previne o comportamento padrão de arrasto
        e.preventDefault();
        console.warn('handleDragStart: Não foi possível encontrar o .task-card mais próximo para a operação de arrasto.');
    }
}

function handleDragOver(e) {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = 'move';
    // Opcional: Adicionar feedback visual ao arrastar sobre
    e.currentTarget.classList.add('border-blue-400', 'border-2');
}

function handleDragLeave(e) {
    // Opcional: Remover feedback visual
    e.currentTarget.classList.remove('border-blue-400', 'border-2');
}

async function handleDrop(e) {
    e.preventDefault();
    // Opcional: Remover feedback visual
    e.currentTarget.classList.remove('border-blue-400', 'border-2');

    const rawTaskId = e.dataTransfer.getData('text/plain'); // Pega o ID completo 'task-X'
    const taskId = rawTaskId.replace('task-', ''); // Extrai apenas o número do ID
    const droppedOnColumn = e.currentTarget; // A coluna onde o item foi solto (div com class 'task-column')
    const newStatus = droppedOnColumn.dataset.status; // Obtém o status do atributo data-status da coluna

    console.log(`handleDrop: Raw Task ID from dataTransfer: ${rawTaskId}, Extracted ID: ${taskId}`);
    console.log(`handleDrop: Solto na coluna com status: ${newStatus}`);

    if (taskId && newStatus) { // Verifica se o ID da tarefa e o novo status são válidos
        await updateTaskStatus(taskId, newStatus);
        // A remoção e re-renderização visual agora é feita exclusivamente por loadAndRenderTasks()
    } else {
        console.warn('handleDrop: ID da tarefa ou novo status é nulo/indefinido. Operação de arrasto abortada.');
    }
    currentDraggedTaskId = null; // Limpa o ID da tarefa arrastada após a operação
}

async function updateTaskStatus(taskId, newStatus) {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login.html';
        return;
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
            console.error('inicial.js: Erro ao atualizar status da tarefa:', errorData.erro);
            alert(`Erro ao atualizar status: ${errorData.erro}`);
            // Se o backend falhar, recarregue para reverter o estado visual
            await loadAndRenderTasks();
            return;
        }

        console.log(`Status da tarefa ${taskId} atualizado para ${newStatus} no backend.`);
        // Após o sucesso no backend, recarregue todas as tarefas para garantir a consistência visual
        await loadAndRenderTasks();

    } catch (error) {
        console.error('inicial.js: Erro na requisição PATCH para atualizar status:', error);
        alert('Erro de conexão ao atualizar status da tarefa.');
        // Reverter a mudança visual em caso de erro de rede
        await loadAndRenderTasks(); // Recarrega para restaurar o estado original
    }
}

// Função para editar tarefa (pode redirecionar ou abrir modal)
function editTask(taskId) {
    console.log(`Editar tarefa com ID: ${taskId}`);
    // CORREÇÃO AQUI: Aponta para criartarefa.html e passa o ID na URL
    window.location.href = `/frontend/templates/criartarefa.html?id=${taskId}`;
}

// Função para deletar tarefa
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
        await loadAndRenderTasks(); // Recarrega as tarefas após a exclusão
    } catch (error) {
        console.error('inicial.js: Erro ao deletar tarefa:', error);
        alert(`Erro ao deletar tarefa: ${error.message}`);
    }
}

// Função para fazer logout
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
        localStorage.removeItem('jwt_token');
        alert('Você já estava desconectado.');
        window.location.href = '/login.html';
    }
}

// Função para buscar dados do perfil do usuário e exibir o nome
async function loadUserProfile() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.log('Nenhum token encontrado para carregar perfil.');
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
            // Se o token for inválido/expirado, limpe e redirecione
            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                alert('Sua sessão expirou. Faça login novamente.');
                window.location.href = '/login.html';
            }
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar perfil:', error);
    }
}

// Chama a função para carregar o perfil do usuário logo no início
document.addEventListener('DOMContentLoaded', loadUserProfile);

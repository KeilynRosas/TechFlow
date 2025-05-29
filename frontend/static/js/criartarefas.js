// frontend/static/js/criartarefas.js

document.addEventListener('DOMContentLoaded', async () => { // Adicionado 'async' aqui
    const taskForm = document.getElementById('taskForm');
    const cancelButton = document.getElementById('cancelButton');
    const formTitle = document.getElementById('form-title'); // Adicione este ID ao seu h2 no HTML
    const submitButton = document.getElementById('submitButton'); // Adicione este ID ao seu botão de submit

    // Listener para o botão de cancelar
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            window.history.back(); // Volta para a página anterior (inicial.html)
        });
    }

    // Validação da autenticação no carregamento da página de cadastro de tarefa
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        alert('Você precisa estar logado para criar/editar tarefas.');
        window.location.href = '/login.html';
        return;
    }

    // Lógica para detectar se é modo de EDIÇÃO
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id'); // Pega o ID da tarefa da URL

    if (taskId) {
        // Se há um ID na URL, estamos em modo de edição
        if (formTitle) formTitle.textContent = 'Editar Tarefa';
        if (submitButton) submitButton.textContent = 'Salvar Alterações';
        await loadTaskForEdit(taskId, token); // Carrega os dados da tarefa
    } else {
        // Modo de criação de tarefa
        if (formTitle) formTitle.textContent = 'Criar Nova Tarefa';
        if (submitButton) submitButton.textContent = 'Salvar Tarefa';
    }


    // Listener para o envio do formulário de criação/edição de tarefa
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o envio padrão do formulário

            const formData = {
                titulo: document.getElementById('titulo').value.trim(),
                descricao: document.getElementById('descricao').value.trim(),
                data_vencimento: document.getElementById('data_vencimento').value,
                prioridade: document.getElementById('prioridade').value,
                projeto: document.getElementById('projeto').value || null,
                concluida: document.getElementById('concluida').checked
            };

            // Validações básicas no frontend
            if (!formData.titulo) {
                alert('O título da tarefa é obrigatório.');
                return;
            }
            if (!formData.data_vencimento) {
                alert('A data de vencimento é obrigatória.');
                return;
            }
            if (!formData.prioridade) {
                alert('A prioridade é obrigatória.');
                return;
            }

            try {
                let response;
                let method;
                let url;

                if (taskId) {
                    // Modo de edição: Envia PATCH ou PUT
                    method = 'PUT'; // Ou 'PATCH' para atualização parcial
                    url = `http://localhost:5000/tasks/${taskId}`;
                    console.log(`criartarefas.js: Enviando requisição ${method} para ${url} com dados:`, formData);
                } else {
                    // Modo de criação: Envia POST
                    method = 'POST';
                    url = 'http://localhost:5000/tasks';
                    console.log(`criartarefas.js: Enviando requisição ${method} para ${url} com dados:`, formData);
                }

                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.erro || 'Erro desconhecido ao salvar tarefa.');
                }

                alert(data.mensagem);
                console.log('criartarefas.js: Tarefa salva com sucesso.');

                window.location.href = '/frontend/templates/inicial.html';

            } catch (error) {
                console.error('criartarefas.js: Erro ao salvar tarefa:', error);
                alert(`Erro ao salvar tarefa: ${error.message}`);
            }
        });
    }
});

// Função para carregar os dados da tarefa para edição
async function loadTaskForEdit(taskId, token) {
    try {
        const response = await fetch(`http://localhost:5000/tasks/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.erro || 'Erro ao carregar tarefa para edição.');
        }

        const task = await response.json();
        console.log('criartarefas.js: Tarefa carregada para edição:', task);

        // Preenche o formulário com os dados da tarefa
        document.getElementById('titulo').value = task.titulo;
        document.getElementById('descricao').value = task.descricao || '';
        // Formata a data de vencimento para o formato 'YYYY-MM-DD'
        if (task.data_vencimento) {
            const dueDate = new Date(task.data_vencimento);
            document.getElementById('data_vencimento').value = dueDate.toISOString().split('T')[0];
        }
        document.getElementById('prioridade').value = task.prioridade;
        document.getElementById('projeto').value = task.projeto || '';
        document.getElementById('concluida').checked = (task.status === 'concluido');

    } catch (error) {
        console.error('criartarefas.js: Erro ao carregar tarefa para edição:', error);
        alert(`Não foi possível carregar a tarefa para edição: ${error.message}`);
        window.history.back(); // Volta para a página anterior se não conseguir carregar
    }
}

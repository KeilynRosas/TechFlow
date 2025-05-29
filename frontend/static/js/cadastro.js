// frontend/static/js/cadastro.js

// Adiciona um listener para o evento 'submit' do formulário de cadastro
document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o comportamento padrão de recarregar a página ao submeter o formulário

    // Coleta os dados dos campos do formulário
    const formData = {
        nome: document.getElementById('nome').value.trim(), // Pega o nome e remove espaços em branco
        email: document.getElementById('email').value.trim().toLowerCase(), // Pega o email, remove espaços e converte para minúsculas
        senha: document.getElementById('senha').value, // Pega a senha
        confirmarSenha: document.getElementById('confirmarSenha').value // Pega a confirmação da senha
    };

    try {
        // Faz uma requisição POST para a rota de cadastro no backend
        const response = await fetch('http://localhost:5000/cadastro', {
            method: 'POST', // Define o método da requisição como POST
            headers: {
                'Content-Type': 'application/json', // Informa ao servidor que o corpo da requisição é JSON
            },
            body: JSON.stringify(formData) // Converte os dados do formulário para JSON e envia no corpo da requisição
        });

        // Converte a resposta do servidor para JSON
        const data = await response.json();

        // Verifica se a resposta não foi bem-sucedida (código de status 2xx)
        if (!response.ok) {
            // Lança um erro com a mensagem retornada pelo backend ou uma mensagem genérica
            throw new Error(data.erro || 'Erro desconhecido ao cadastrar');
        }

        // Se o cadastro foi bem-sucedido e o backend retornou um token
        if (data.token) {
            // Armazena o token no localStorage para manter o usuário logado automaticamente
            localStorage.setItem('jwt_token', data.token);
            alert(data.mensagem); // Exibe uma mensagem de sucesso para o usuário
            // Redireciona o usuário para a tela principal imediatamente após o cadastro
            window.location.href = '/frontend/templates/inicial.html';
        } else {
            // Se o backend não retornou um token (o que não deveria acontecer se o app.py estiver correto)
            // Exibe uma mensagem e redireciona para a tela de login, pedindo que o usuário faça o login manualmente
            alert(data.mensagem + '\nPor favor, faça login para continuar.');
            window.location.href = 'frontend/templates/login.html'; // Redireciona para a tela de login
        }

    } catch (error) {
        // Captura e exibe qualquer erro que ocorra durante o processo de cadastro
        alert(`Erro no cadastro: ${error.message}`);
    }
});

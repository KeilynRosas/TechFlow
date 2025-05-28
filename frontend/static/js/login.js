// frontend/static/js/login.js

// Adiciona um listener para o evento 'submit' do formulário de login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o comportamento padrão de recarregar a página

    // Coleta os dados dos campos de email e senha
    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;

    try {
        // Faz uma requisição POST para a rota de login no backend
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, senha }) // Envia email e senha como JSON
        });

        // Converte a resposta do servidor para JSON
        const data = await response.json();

        // Verifica se a resposta não foi bem-sucedida
        if (!response.ok) {
            // Lança um erro com a mensagem retornada pelo backend ou uma mensagem genérica
            throw new Error(data.erro || 'Erro desconhecido ao fazer login');
        }

        // Se o login foi bem-sucedido, o backend deve retornar um token JWT
        if (data.token) {
            // Armazena o token no localStorage para manter o usuário logado
            localStorage.setItem('jwt_token', data.token);
            alert(data.mensagem); // Exibe uma mensagem de sucesso
            // Redireciona o usuário para a tela principal
            window.location.href = '/frontend/templates/inicial.html';
        } else {
            // Se não houver token, mas a resposta for ok, algo inesperado aconteceu
            alert(data.mensagem || 'Login bem-sucedido, mas sem token de autenticação.');
        }

    } catch (error) {
        // Captura e exibe qualquer erro que ocorra durante o processo de login
        alert(`Erro no login: ${error.message}`);
    }
});
// frontend/static/js/authChecker.js

/**
 * @function checkAuthentication
 * @description Verifica a presença de um token JWT no localStorage.
 * Se o token não existir, redireciona o usuário para a página de login.
 * Se existir, tenta buscar o perfil do usuário para preencher o nome.
 */
async function checkAuthentication() {
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        alert('Você precisa estar logado para acessar esta página.');
        window.location.href = '/frontend/templates/inicial.html';
        return false;
    }

    // Se o token existe, tente buscar os dados do perfil para preencher o nome
    try {
        const response = await fetch('http://localhost:5000/perfil', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Se o token for inválido ou expirado, o backend retornará 401
            localStorage.removeItem('jwt_token'); // Remove o token inválido
            alert('Sua sessão expirou ou o token é inválido. Por favor, faça login novamente.');
            window.location.href = '/frontend/templates/inicial.html';
            return false;
        }

        const userData = await response.json();
        // Preenche o nome do usuário na tela inicial
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = userData.nome || 'Usuário';
        }
        return true;

    } catch (error) {
        console.error('Erro na validação do token ou ao buscar perfil:', error);
        localStorage.removeItem('jwt_token');
        alert('Erro ao verificar sua sessão. Por favor, faça login novamente.');
        window.location.href = '/frontend/templates/inicial.html';
        return false;
    }
}

// Chama a função de verificação de autenticação imediatamente
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
});

// frontend/static/js/authChecker.js

async function checkAuthentication() {
    const token = localStorage.getItem('jwt_token');
    console.log('authChecker: Token encontrado no localStorage:', token ? 'Sim' : 'Não');

    if (!token) {
        console.log('authChecker: Nenhum token, redirecionando para login.');
        alert('Você precisa estar logado para acessar esta página.');
        window.location.href = '/login.html';
        return false;
    }

    try {
        console.log('authChecker: Tentando verificar token com /perfil...');
        const response = await fetch('http://localhost:5000/perfil', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('authChecker: Resposta do /perfil. Status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('authChecker: Erro ao validar token no backend:', errorData.erro);
            localStorage.removeItem('jwt_token');
            alert(`Sua sessão expirou ou o token é inválido: ${errorData.erro}. Por favor, faça login novamente.`);
            window.location.href = '/login.html';
            return false;
        }

        const userData = await response.json();
        console.log('authChecker: Token válido. Dados do usuário:', userData);

        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = userData.nome || 'Usuário';
            console.log('authChecker: Nome do usuário atualizado para:', userData.nome);
        }
        return true;

    } catch (error) {
        console.error('authChecker: Erro na validação do token ou ao buscar perfil:', error);
        localStorage.removeItem('jwt_token');
        alert('Erro ao verificar sua sessão. Por favor, faça login novamente.');
        window.location.href = '/login.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('authChecker: DOM Content Loaded, iniciando verificação de autenticação.');
    checkAuthentication();
});
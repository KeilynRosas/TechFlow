// frontend/static/js/authChecker.js

/**
 * @function checkAuthentication
 * @description Verifica a presença de um token JWT no localStorage.
 * Se o token não existir, redireciona o usuário para a página de login.
 * Esta função deve ser chamada no carregamento de páginas que exigem autenticação.
 */
function checkAuthentication() {
    // Tenta obter o token JWT armazenado no localStorage
    const token = localStorage.getItem('jwt_token');

    // Se não houver token, o usuário não está autenticado
    if (!token) {
        // Exibe um alerta (opcional, para feedback ao usuário)
        alert('Você precisa estar logado para acessar esta página.');
        // Redireciona o usuário para a página de login
        // Certifique-se de que o caminho para login.html está correto
        window.location.href = '/login.html';
        return false; // Indica que a autenticação falhou
    }
    // Se houver token, a autenticação básica foi bem-sucedida (do lado do cliente)
    return true; // Indica que a autenticação foi bem-sucedida
}

// Chama a função de verificação de autenticação imediatamente quando este script é carregado
// Isso garante que a verificação ocorra antes que o conteúdo da página seja totalmente exibido
checkAuthentication();

// Opcional: Para uma validação mais robusta, você pode adicionar uma chamada ao backend
// para validar o token. Isso é importante para verificar se o token não expirou
// ou foi revogado. Exemplo:
/*
async function validateTokenWithBackend(token) {
    try {
        const response = await fetch('http://localhost:5000/perfil', { // Ou uma rota de validação específica
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Se a resposta não for OK, o token é inválido (expirado, modificado, etc.)
            throw new Error('Token inválido ou expirado.');
        }
        // Token é válido, retorna os dados do usuário (opcional)
        return await response.json();
    } catch (error) {
        console.error('Erro na validação do token:', error);
        localStorage.removeItem('jwt_token'); // Remove o token inválido
        window.location.href = '/login.html'; // Redireciona
        return false;
    }
}

// Para usar a validação completa (descomente se necessário):
// if (checkAuthentication()) {
//     const token = localStorage.getItem('jwt_token');
//     validateTokenWithBackend(token);
// }
*/
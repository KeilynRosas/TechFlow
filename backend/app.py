# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
import re
import logging

# =============================================
# CONFIGURAÇÃO INICIAL
# =============================================
app = Flask(__name__, static_folder='../frontend/static', template_folder='../frontend/templates')
CORS(app)  # Habilita CORS para desenvolvimento

# Configurações
app.config['SECRET_KEY'] = 'techflow-super-secret-key' # Chave secreta para segurança geral
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///techflow.db' # URI do banco de dados SQLite
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Desabilita rastreamento de modificações para melhor performance
app.config['JWT_SECRET_KEY'] = 'techflow-jwt-secret-key' # Chave secreta para assinar tokens JWT
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1) # Tempo de expiração do token JWT (1 hora)

# Inicialização do banco de dados
db = SQLAlchemy(app)

# Configuração de logging
logging.basicConfig(level=logging.DEBUG) # Nível de logging para debug
logger = logging.getLogger(__name__) # Instância do logger

# =============================================
# MODELO DE DADOS
# =============================================
class Usuario(db.Model):
    # Define a tabela 'usuario' no banco de dados
    id = db.Column(db.Integer, primary_key=True) # Coluna de ID, chave primária
    nome = db.Column(db.String(100), nullable=False) # Coluna para o nome, não pode ser nula
    email = db.Column(db.String(100), unique=True, nullable=False) # Coluna para o email, deve ser único e não nulo
    senha = db.Column(db.String(200), nullable=False) # Coluna para a senha (hash), não pode ser nula

    def __repr__(self):
        # Representação do objeto Usuario para depuração
        return f'<Usuario {self.email}>'

# Cria tabelas (executar uma vez quando o aplicativo é iniciado)
with app.app_context():
    db.create_all() # Cria todas as tabelas definidas pelos modelos

# =============================================
# FUNÇÕES AUXILIARES
# =============================================
def validar_email(email):
    """
    Função para validar o formato de um endereço de email usando regex.
    """
    try:
        return re.match(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$', email) # Expressão regular para validar email
    except Exception as e:
        logger.error(f"Erro na validação de email: {str(e)}")
        return False

# =============================================
# ROTAS PARA SERVIR ARQUIVOS DO FRONTEND (HTML, CSS, JS, IMAGENS)
# =============================================
@app.route('/')
def index():
    """Rota raiz que serve a página de login."""
    return send_from_directory(app.template_folder, 'login.html')

@app.route('/login.html')
def serve_login():
    """Rota para servir a página de login."""
    return send_from_directory(app.template_folder, 'login.html')

@app.route('/teladecadastro.html')
def serve_cadastro_html():
    """Rota para servir a página de cadastro."""
    return send_from_directory(app.template_folder, 'teladecadastro.html')

@app.route('/frontend/templates/inicial.html')
def serve_inicial_html():
    """Rota para servir a página inicial (principal) do aplicativo."""
    return send_from_directory(app.template_folder, 'inicial.html')

@app.route('/frontend/static/<path:filename>')
def serve_static_files(filename):
    """
    Rota para servir arquivos estáticos (CSS, JS, imagens) do frontend.
    O 'path:filename' permite que esta rota capture qualquer subcaminho após '/frontend/static/'.
    """
    # Usamos app.static_folder que já foi configurado para '../frontend/static'
    return send_from_directory(app.static_folder, filename)

# =============================================
# ROTAS DE AUTENTICAÇÃO
# =============================================
@app.route('/cadastro', methods=['POST'])
def cadastrar_usuario():
    """
    Rota para cadastrar um novo usuário.
    Recebe nome, email, senha e confirmação de senha.
    Retorna uma mensagem de sucesso e um token JWT se o cadastro for bem-sucedido.
    """
    try:
        dados = request.get_json() # Obtém os dados JSON da requisição

        # Validação de campos obrigatórios
        campos_obrigatorios = ['nome', 'email', 'senha', 'confirmarSenha']
        for campo in campos_obrigatorios:
            if campo not in dados:
                return jsonify({'erro': f'Campo obrigatório faltando: {campo}'}), 400 # Retorna erro 400 se faltar campo

        # Validações específicas
        if not validar_email(dados['email']):
            return jsonify({'erro': 'Formato de email inválido'}), 400 # Retorna erro 400 se o email for inválido

        if len(dados['senha']) < 8:
            return jsonify({'erro': 'Senha deve ter pelo menos 8 caracteres'}), 400 # Retorna erro 400 se a senha for muito curta

        if dados['senha'] != dados['confirmarSenha']:
            return jsonify({'erro': 'As senhas não coincidem'}), 400 # Retorna erro 400 se as senhas não coincidirem

        # Verifica se o email já está cadastrado
        if Usuario.query.filter_by(email=dados['email'].lower()).first():
            return jsonify({'erro': 'Email já cadastrado'}), 409 # Retorna erro 409 se o email já existe

        # Cria um novo objeto Usuario
        novo_usuario = Usuario(
            nome=dados['nome'].strip(), # Remove espaços em branco do nome
            email=dados['email'].lower().strip(), # Remove espaços em branco e converte email para minúsculas
            senha=generate_password_hash(dados['senha'], method='scrypt') # Gera o hash da senha usando scrypt
        )

        db.session.add(novo_usuario) # Adiciona o novo usuário à sessão do banco de dados
        db.session.commit() # Salva as mudanças no banco de dados

        # Gera token JWT para o usuário recém-cadastrado
        token = jwt.encode({
            'sub': novo_usuario.id,
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
            'nome': novo_usuario.nome
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'mensagem': 'Cadastro realizado com sucesso!',
            'token': token, # Retorna o token JWT
            'usuario': {
                'id': novo_usuario.id,
                'nome': novo_usuario.nome,
                'email': novo_usuario.email
            }
        }), 201 # Retorna sucesso 201 (Created)

    except Exception as e:
        logger.error(f"Erro no cadastro: {str(e)}") # Loga o erro
        db.session.rollback() # Desfaz quaisquer operações de banco de dados em caso de erro
        return jsonify({'erro': 'Erro interno no servidor'}), 500 # Retorna erro 500

@app.route('/login', methods=['POST'])
def login_usuario():
    """
    Rota para autenticar um usuário.
    Recebe email e senha.
    Retorna um token JWT se as credenciais forem válidas.
    """
    try:
        dados = request.get_json() # Obtém os dados JSON da requisição

        # Validação básica de campos obrigatórios
        if not dados or 'email' not in dados or 'senha' not in dados:
            return jsonify({"erro": "Email e senha são obrigatórios"}), 400 # Retorna erro 400

        # Busca o usuário pelo email
        usuario = Usuario.query.filter_by(
            email=dados['email'].lower().strip()
        ).first()

        # Verifica se o usuário existe e se a senha está correta
        if not usuario or not check_password_hash(usuario.senha, dados['senha']):
            return jsonify({"erro": "Credenciais inválidas"}), 401 # Retorna erro 401 (Unauthorized)

        # Gera token JWT
        token = jwt.encode({
            'sub': usuario.id, # 'sub' (subject) é o ID do usuário
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'], # Tempo de expiração do token
            'nome': usuario.nome # Adiciona o nome do usuário ao payload do token
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256') # Assina o token com a chave secreta e algoritmo HS256

        return jsonify({
            "mensagem": "Login realizado com sucesso!",
            "token": token, # Retorna o token JWT
            "usuario": {
                "id": usuario.id,
                "nome": usuario.nome,
                "email": usuario.email
            }
        }), 200 # Retorna sucesso 200

    except Exception as e:
        logger.error(f"Erro no login: {str(e)}") # Loga o erro
        return jsonify({"erro": "Erro interno no servidor"}), 500

@app.route('/logout', methods=['POST'])
def logout_usuario():
    """
    Rota para fazer logout. No caso de JWT, o logout é principalmente do lado do cliente,
    removendo o token. No backend, podemos apenas confirmar a requisição.
    """
    # Em sistemas baseados em token, o logout é geralmente manipulado no cliente
    # (removendo o token do localStorage/cookies).
    # Esta rota pode ser usada para invalidação de token em listas negras,
    # mas para este escopo, é apenas um endpoint de confirmação.
    return jsonify({"mensagem": "Logout realizado com sucesso."}), 200

# =============================================
# ROTA DE VERIFICAÇÃO (PROTEGIDA)
# =============================================
@app.route('/perfil', methods=['GET'])
def perfil_usuario():
    """
    Rota protegida para obter os dados do perfil do usuário.
    Requer um token JWT válido no cabeçalho Authorization.
    """
    try:
        # Extrai o token do cabeçalho Authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"erro": "Token não fornecido ou formato inválido"}), 401

        token = auth_header.split()[1] # Pega a parte do token após "Bearer "

        # Decodifica o token JWT
        payload = jwt.decode(
            token,
            app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )

        # Busca o usuário pelo ID contido no payload do token
        usuario = Usuario.query.get(payload['sub'])

        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        return jsonify({
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email
        }), 200 # Retorna os dados do usuário

    except jwt.ExpiredSignatureError:
        return jsonify({"erro": "Token expirado. Por favor, faça login novamente."}), 401
    except jwt.InvalidTokenError:
        return jsonify({"erro": "Token inválido. Por favor, faça login novamente."}), 401
    except Exception as e:
        logger.error(f"Erro de autenticação no perfil: {str(e)}")
        return jsonify({"erro": "Acesso não autorizado ou erro interno"}), 401

# =============================================
# ROTA DE SAÚDE
# =============================================
@app.route('/health', methods=['GET'])
def health_check():
    """
    Rota para verificar a saúde do servidor.
    """
    return jsonify({
        "status": "online",
        "versao": "1.0.0",
        "hora_servidor": datetime.utcnow().isoformat()
    }), 200

if __name__ == '__main__':
    # Inicia o servidor Flask em modo de depuração
    app.run(host='0.0.0.0', port=5000, debug=True)
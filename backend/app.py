# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
import re
import os
import logging
from functools import wraps # Importado para o decorador jwt_required

# =============================================
# CONFIGURAÇÃO INICIAL DA APLICAÇÃO FLASK
# =============================================
# Obtém o diretório raiz do projeto de forma robusta,
# assumindo que app.py está dentro de 'backend/'
diretorio_raiz_projeto = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
frontend_static_folder = os.path.join(diretorio_raiz_projeto, 'frontend', 'static')
frontend_templates_folder = os.path.join(diretorio_raiz_projeto, 'frontend', 'templates')

# Inicializa o aplicativo Flask, configurando as pastas de arquivos estáticos e templates
app = Flask(
    __name__,
    static_folder=frontend_static_folder,
    template_folder=frontend_templates_folder
)
CORS(app)  # Habilita CORS para permitir requisições do frontend para o backend

# Configurações da aplicação
app.config['SECRET_KEY'] = 'techflow-super-secret-key-para-seguranca-geral-do-flask'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///techflow.db' # Configura o banco de dados SQLite
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Desabilita o rastreamento de modificações para melhor performance
app.config['JWT_SECRET_KEY'] = 'UMA_CHAVE_SECRETA_MUITO_FORTE_E_UNICA_PARA_O_JWT_TECHFLOW_AQUI_2025_XYZ' # Chave secreta para assinar tokens JWT
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24) # Tempo de expiração do token JWT (24 horas para facilitar testes)

# Inicialização do banco de dados SQLAlchemy
db = SQLAlchemy(app)

# Configuração de logging para depuração
logging.basicConfig(level=logging.INFO) # Nível de logging: INFO para mensagens gerais, DEBUG para detalhes
logger = logging.getLogger(__name__)

# =============================================
# DECORADOR PARA PROTEÇÃO DE ROTAS COM JWT
# =============================================
def jwt_required(f):
    """
    Decorador para proteger rotas, exigindo um token JWT válido no cabeçalho Authorization.
    Se o token for válido, o ID do usuário é adicionado a request.user_id.
    """
    @wraps(f) # Mantém os metadados da função original
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        # Verifica se o cabeçalho Authorization está presente e no formato correto
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Tentativa de acesso não autorizado: Token não fornecido ou formato inválido.")
            return jsonify({"erro": "Token não fornecido ou formato inválido"}), 401

        token = auth_header.split()[1] # Extrai o token da string "Bearer <token>"

        try:
            # Decodifica o token JWT usando a chave secreta e o algoritmo
            payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            # CORREÇÃO: Converte o 'sub' de volta para inteiro, pois ele é salvo como string no token
            request.user_id = int(payload['sub']) # Armazena o ID do usuário (subject) na requisição como int
        except jwt.ExpiredSignatureError:
            logger.warning(f"Tentativa de acesso com token expirado. Token: {token[:30]}...")
            return jsonify({"erro": "Token expirado. Faça login novamente."}), 401
        except jwt.InvalidTokenError as e:
            logger.error(f"Tentativa de acesso com token inválido: {e}. Token: {token[:30]}...")
            return jsonify({"erro": f"Token inválido: {e}. Faça login novamente."}), 401
        except Exception as e:
            logger.error(f"Erro inesperado ao decodificar token: {e}. Token: {token[:30]}...")
            return jsonify({"erro": "Erro interno do servidor ao validar token."}), 500
        return f(*args, **kwargs) # Continua para a função da rota se o token for válido
    return decorated

# =============================================
# MODELOS DE DADOS DO BANCO DE DADOS
# =============================================
class Usuario(db.Model):
    """
    Modelo para a tabela 'usuario' no banco de dados.
    Armazena informações dos usuários e tem uma relação com suas tarefas.
    """
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(200), nullable=False)
    # Relação: um usuário pode ter muitas tarefas.
    # 'cascade="all, delete-orphan"' garante que tarefas são deletadas se o usuário for.
    tarefas = db.relationship('Tarefa', backref='usuario', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Usuario {self.email}>'

class Tarefa(db.Model):
    """
    Modelo para a tabela 'tarefa' no banco de dados.
    Armazena detalhes de cada tarefa associada a um usuário.
    """
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    data_vencimento = db.Column(db.DateTime, nullable=False)
    prioridade = db.Column(db.String(50), nullable=False) # Ex: 'Baixa', 'Média', 'Alta'
    projeto = db.Column(db.String(100), nullable=True) # Ex: 'Familiar', 'Financeiro', 'Pessoal'
    status = db.Column(db.String(50), default='a fazer', nullable=False) # Ex: 'a fazer', 'fazendo', 'concluido'
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    data_conclusao = db.Column(db.DateTime, nullable=True) # Preenchida quando o status é 'concluido'
    # Chave estrangeira para ligar a tarefa a um usuário específico
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)

    def __repr__(self):
        return f'<Tarefa {self.titulo} ({self.status})>'

    def to_dict(self):
        """
        Converte o objeto Tarefa para um dicionário, útil para respostas JSON.
        Formata datas para ISO 8601.
        """
        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'prioridade': self.prioridade,
            'projeto': self.projeto,
            'status': self.status,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_conclusao': self.data_conclusao.isoformat() if self.data_conclusao else None,
            'usuario_id': self.usuario_id
        }

# Cria as tabelas no banco de dados (se não existirem) ao iniciar o aplicativo.
# Este bloco garante que o contexto da aplicação esteja ativo para operações de BD.
with app.app_context():
    db.create_all()

# =============================================
# FUNÇÕES AUXILIARES
# =============================================
def validar_email(email):
    """
    Valida o formato de um endereço de email usando uma expressão regular.
    """
    try:
        return re.match(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$', email)
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
    """Rota para servir a página de cadastro de usuário."""
    return send_from_directory(app.template_folder, 'teladecadastro.html')

@app.route('/frontend/templates/inicial.html')
def serve_inicial_html():
    """Rota para servir a página inicial (principal) do aplicativo To-Do List."""
    return send_from_directory(app.template_folder, 'inicial.html')

# NOVA ROTA ADICIONADA/AJUSTADA PARA CRIARTAREFA.HTML
@app.route('/frontend/templates/criartarefa.html')
def serve_criar_tarefa_html():
    """Rota para servir a página de criação de tarefas (criartarefa.html)."""
    return send_from_directory(app.template_folder, 'criartarefa.html')


@app.route('/frontend/static/<path:filename>')
def serve_static_files(filename):
    """
    Rota para servir arquivos estáticos (CSS, JS, imagens) do frontend.
    O 'path:filename' permite que esta rota capture qualquer subcaminho após '/frontend/static/'.
    """
    return send_from_directory(app.static_folder, filename)

# =============================================
# ROTAS DE AUTENTICAÇÃO DE USUÁRIOS
# =============================================
@app.route('/cadastro', methods=['POST'])
def cadastrar_usuario():
    """
    Rota para cadastrar um novo usuário.
    Recebe nome, email, senha e confirmação de senha.
    Retorna uma mensagem de sucesso e um token JWT para login automático.
    """
    try:
        dados = request.get_json()

        # Validação de campos obrigatórios
        campos_obrigatorios = ['nome', 'email', 'senha', 'confirmarSenha']
        for campo in campos_obrigatorios:
            if campo not in dados or not dados[campo]:
                return jsonify({'erro': f'Campo obrigatório faltando ou vazio: {campo}'}), 400

        # Validações específicas do email e senha
        if not validar_email(dados['email']):
            return jsonify({'erro': 'Formato de email inválido'}), 400

        if len(dados['senha']) < 8:
            return jsonify({'erro': 'Senha deve ter pelo menos 8 caracteres'}), 400

        if dados['senha'] != dados['confirmarSenha']:
            return jsonify({'erro': 'As senhas não coincidem'}), 400

        # Verifica se o email já está cadastrado no sistema
        if Usuario.query.filter_by(email=dados['email'].lower()).first():
            return jsonify({'erro': 'Email já cadastrado'}), 409 # Conflict

        # Cria um novo objeto Usuario e faz o hash da senha
        novo_usuario = Usuario(
            nome=dados['nome'].strip(),
            email=dados['email'].lower().strip(),
            senha=generate_password_hash(dados['senha'], method='scrypt')
        )

        db.session.add(novo_usuario)
        db.session.commit()

        # CORREÇÃO: Converte o ID do usuário para string antes de incluí-lo no token
        token = jwt.encode({
            'sub': str(novo_usuario.id), # <<< AQUI: ID do usuário como STRING
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
            'nome': novo_usuario.nome
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        logger.info(f"Usuário {novo_usuario.email} cadastrado com sucesso.")
        return jsonify({
            'mensagem': 'Cadastro realizado com sucesso!',
            'token': token,
            'usuario': {
                'id': novo_usuario.id,
                'nome': novo_usuario.nome,
                'email': novo_usuario.email
            }
        }), 201 # Created

    except Exception as e:
        logger.error(f"Erro no cadastro de usuário: {str(e)}")
        db.session.rollback() # Desfaz a transação em caso de erro
        return jsonify({'erro': 'Erro interno no servidor ao cadastrar usuário.'}), 500

@app.route('/login', methods=['POST'])
def login_usuario():
    """
    Rota para autenticar um usuário.
    Recebe email e senha.
    Retorna um token JWT se as credenciais forem válidas.
    """
    try:
        dados = request.get_json()

        # Validação básica de campos obrigatórios
        if not dados or 'email' not in dados or 'senha' not in dados:
            return jsonify({"erro": "Email e senha são obrigatórios"}), 400

        # Busca o usuário pelo email no banco de dados
        usuario = Usuario.query.filter_by(
            email=dados['email'].lower().strip()
        ).first()

        # Verifica se o usuário existe e se a senha fornecida corresponde ao hash
        if not usuario or not check_password_hash(usuario.senha, dados['senha']):
            return jsonify({"erro": "Credenciais inválidas"}), 401 # Unauthorized

        # CORREÇÃO: Converte o ID do usuário para string antes de incluí-lo no token
        token = jwt.encode({
            'sub': str(usuario.id), # <<< AQUI: ID do usuário como STRING
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'], # Tempo de expiração
            'nome': usuario.nome # Adiciona o nome do usuário ao payload do token
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        logger.info(f"Usuário {usuario.email} logado com sucesso.")
        return jsonify({
            "mensagem": "Login realizado com sucesso!",
            "token": token,
            "usuario": {
                "id": usuario.id,
                "nome": usuario.nome,
                "email": usuario.email
            }
        }), 200 # OK

    except Exception as e:
        logger.error(f"Erro no login de usuário: {str(e)}")
        return jsonify({"erro": "Erro interno no servidor ao fazer login."}), 500

@app.route('/logout', methods=['POST'])
def logout_usuario():
    """
    Rota para fazer logout. Em sistemas baseados em token, o logout é
    principalmente uma ação do lado do cliente (removendo o token do localStorage).
    Esta rota serve como um endpoint de confirmação ou para futuras invalidações de token.
    """
    logger.info("Requisição de logout recebida.")
    return jsonify({"mensagem": "Logout realizado com sucesso."}), 200

@app.route('/perfil', methods=['GET'])
@jwt_required # Protege esta rota, exigindo um token JWT válido
def perfil_usuario():
    """
    Rota protegida para obter os dados do perfil do usuário logado.
    O ID do usuário é obtido do token JWT decodificado por jwt_required.
    """
    try:
        # O ID do usuário é acessado via request.user_id, definido pelo decorador jwt_required
        usuario = Usuario.query.get(request.user_id)

        if not usuario:
            logger.warning(f"Perfil solicitado para user_id {request.user_id} não encontrado.")
            return jsonify({"erro": "Usuário não encontrado"}), 404

        logger.info(f"Perfil do usuário {usuario.email} solicitado com sucesso.")
        return jsonify({
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar perfil do usuário {request.user_id}: {str(e)}")
        return jsonify({"erro": "Erro interno do servidor ao buscar perfil."}), 500

# =============================================
# ROTAS DE GERENCIAMENTO DE TAREFAS
# =============================================
@app.route('/tasks', methods=['POST'])
@jwt_required # Protege esta rota, garantindo que apenas usuários logados podem criar tarefas
def criar_tarefa():
    """
    Cria uma nova tarefa para o usuário logado.
    Recebe título, descrição, data de vencimento, prioridade, projeto e status inicial.
    """
    try:
        dados = request.get_json()

        # Validação de campos obrigatórios
        campos_obrigatorios = ['titulo', 'data_vencimento', 'prioridade']
        for campo in campos_obrigatorios:
            if campo not in dados or not dados[campo]:
                return jsonify({'erro': f'Campo obrigatório faltando ou vazio: {campo}'}), 400

        # Validação e conversão da data de vencimento
        try:
            data_vencimento = datetime.strptime(dados['data_vencimento'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'erro': 'Formato de data de vencimento inválido. Use AAAA-MM-DD.'}), 400

        # Validação da prioridade
        prioridades_validas = ['Baixa', 'Média', 'Alta']
        if dados['prioridade'] not in prioridades_validas:
            return jsonify({'erro': 'Prioridade inválida. Use Baixa, Média ou Alta.'}), 400

        # Validação do projeto (opcional, trata string vazia como None)
        projeto_associado = dados.get('projeto')
        if projeto_associado == '':
            projeto_associado = None

        # Define o status inicial com base no checkbox 'concluida'
        status_inicial = 'a fazer'
        if dados.get('concluida') == True:
            status_inicial = 'concluido'

        nova_tarefa = Tarefa(
            titulo=dados['titulo'].strip(),
            descricao=dados.get('descricao', '').strip(),
            data_vencimento=data_vencimento,
            prioridade=dados['prioridade'],
            projeto=projeto_associado,
            status=status_inicial,
            usuario_id=request.user_id # Associa a tarefa ao usuário logado
        )

        db.session.add(nova_tarefa)
        db.session.commit()

        logger.info(f"Tarefa '{nova_tarefa.titulo}' criada para o usuário {request.user_id}.")
        return jsonify({
            'mensagem': 'Tarefa criada com sucesso!',
            'tarefa': nova_tarefa.to_dict()
        }), 201 # Created

    except Exception as e:
        logger.error(f"Erro ao criar tarefa para o usuário {request.user_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'erro': 'Erro interno no servidor ao criar tarefa.'}), 500

# Rota para obter uma tarefa específica por ID (para edição)
@app.route('/tasks/<int:task_id>', methods=['GET'])
@jwt_required
def obter_tarefa_por_id(task_id):
    """
    Obtém os detalhes de uma tarefa específica do usuário logado.
    """
    try:
        tarefa = Tarefa.query.filter_by(id=task_id, usuario_id=request.user_id).first()
        if not tarefa:
            return jsonify({'erro': 'Tarefa não encontrada ou não pertence ao usuário.'}), 404
        return jsonify(tarefa.to_dict()), 200
    except Exception as e:
        logger.error(f"Erro ao obter tarefa {task_id} para o usuário {request.user_id}: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor ao obter tarefa.'}), 500


# Rota para atualizar uma tarefa existente (para edição)
@app.route('/tasks/<int:task_id>', methods=['PUT', 'PATCH'])
@jwt_required
def atualizar_tarefa(task_id):
    """
    Atualiza uma tarefa existente do usuário logado.
    Pode ser usado para atualização completa (PUT) ou parcial (PATCH).
    """
    try:
        dados = request.get_json()
        tarefa = Tarefa.query.filter_by(id=task_id, usuario_id=request.user_id).first()

        if not tarefa:
            return jsonify({'erro': 'Tarefa não encontrada ou não pertence ao usuário.'}), 404

        logger.info(f"Atualizando tarefa {task_id}. Dados recebidos: {dados}")
        logger.info(f"Status atual da tarefa {task_id} antes da atualização: {tarefa.status}")

        # Atualiza os campos se eles estiverem presentes nos dados
        if 'titulo' in dados and dados['titulo']:
            tarefa.titulo = dados['titulo'].strip()
        if 'descricao' in dados: # Permite descrição vazia
            tarefa.descricao = dados['descricao'].strip()
        if 'data_vencimento' in dados and dados['data_vencimento']:
            try:
                tarefa.data_vencimento = datetime.strptime(dados['data_vencimento'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'erro': 'Formato de data de vencimento inválido. Use AAAA-MM-DD.'}), 400
        if 'prioridade' in dados and dados['prioridade']:
            prioridades_validas = ['Baixa', 'Média', 'Alta']
            if dados['prioridade'] not in prioridades_validas:
                return jsonify({'erro': 'Prioridade inválida. Use Baixa, Média ou Alta.'}), 400
            tarefa.prioridade = dados['prioridade']
        if 'projeto' in dados: # Permite projeto vazio/nulo
            tarefa.projeto = dados['projeto'] if dados['projeto'] != '' else None

        # Lógica para atualização de status (se vier no payload de edição)
        # Isso é diferente do PATCH de drag-and-drop que só muda o status
        if 'concluida' in dados:
            if dados['concluida'] == True and tarefa.status != 'concluido':
                tarefa.status = 'concluido'
                tarefa.data_conclusao = datetime.utcnow()
            elif dados['concluida'] == False and tarefa.status == 'concluido':
                tarefa.status = 'a fazer' # Ou 'fazendo', dependendo da lógica
                tarefa.data_conclusao = None
            # Se o status vier explicitamente, mas não for 'concluida', atualiza
            elif 'status' in dados and dados['status'] in ['a fazer', 'fazendo', 'concluido']:
                tarefa.status = dados['status']
                if tarefa.status != 'concluido':
                    tarefa.data_conclusao = None

        logger.info(f"Status da tarefa {task_id} APÓS atualização de campos: {tarefa.status}")
        db.session.commit() # <<< AQUI: Garante que as mudanças são salvas no banco de dados

        logger.info(f"Tarefa {task_id} atualizada e commitada pelo usuário {request.user_id}. Novo status: {tarefa.status}")
        return jsonify({'mensagem': 'Tarefa atualizada com sucesso!', 'tarefa': tarefa.to_dict()}), 200

    except Exception as e:
        logger.error(f"Erro ao atualizar tarefa {task_id} para o usuário {request.user_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'erro': 'Erro interno no servidor ao atualizar tarefa.'}), 500


@app.route('/tasks', methods=['GET'])
@jwt_required # Protege esta rota
def listar_tarefas():
    """
    Lista todas as tarefas do usuário logado, agrupadas por status.
    As tarefas são ordenadas pela data de vencimento.
    """
    try:
        todas_tarefas = Tarefa.query.filter_by(usuario_id=request.user_id).order_by(Tarefa.data_vencimento).all()

        tarefas_por_status = {
            'a fazer': [],
            'fazendo': [],
            'concluido': []
        }

        for tarefa in todas_tarefas:
            if tarefa.status in tarefas_por_status:
                tarefas_por_status[tarefa.status].append(tarefa.to_dict())

        logger.info(f"Tarefas listadas para o usuário {request.user_id}. Quantidade: A Fazer={len(tarefas_por_status['a fazer'])}, Fazendo={len(tarefas_por_status['fazendo'])}, Concluído={len(tarefas_por_status['concluido'])}")
        return jsonify(tarefas_por_status), 200

    except Exception as e:
        logger.error(f"Erro ao listar tarefas para o usuário {request.user_id}: {str(e)}")
        return jsonify({'erro': 'Erro interno no servidor ao listar tarefas.'}), 500

@app.route('/tasks/<int:task_id>', methods=['PATCH'])
@jwt_required # Protege esta rota
def atualizar_status_tarefa(task_id):
    """
    Atualiza o status de uma tarefa específica do usuário logado.
    Usado principalmente para a funcionalidade de arrastar e soltar (drag-and-drop).
    """
    try:
        dados = request.get_json()
        novo_status = dados.get('status')

        # Validação do novo status
        if not novo_status or novo_status not in ['a fazer', 'fazendo', 'concluido']:
            return jsonify({'erro': 'Status inválido fornecido.'}), 400

        # Busca a tarefa pelo ID e garante que ela pertence ao usuário logado
        tarefa = Tarefa.query.filter_by(id=task_id, usuario_id=request.user_id).first()

        if not tarefa:
            logger.warning(f"Tentativa de atualizar tarefa {task_id} não encontrada ou não pertencente ao usuário {request.user_id}.")
            return jsonify({'erro': 'Tarefa não encontrada ou não pertence ao usuário.'}), 404

        logger.info(f"Recebida requisição PATCH para tarefa {task_id}. Novo status desejado: '{novo_status}'. Status atual: '{tarefa.status}'")

        # Atualiza a data de conclusão se o status mudar para 'concluido'
        if novo_status == 'concluido' and tarefa.status != 'concluido':
            tarefa.data_conclusao = datetime.utcnow()
            logger.info(f"Definindo data de conclusão para tarefa {task_id}.")
        # Remove a data de conclusão se o status mudar de 'concluido' para outro
        elif novo_status != 'concluido' and tarefa.status == 'concluido':
            tarefa.data_conclusao = None
            logger.info(f"Removendo data de conclusão para tarefa {task_id}.")

        tarefa.status = novo_status
        db.session.commit() # <<< AQUI: Garante que as mudanças são salvas no banco de dados

        logger.info(f"Status da tarefa {task_id} atualizado para '{novo_status}' e commitado pelo usuário {request.user_id}.")
        return jsonify({'mensagem': 'Status da tarefa atualizado com sucesso!', 'tarefa': tarefa.to_dict()}), 200

    except Exception as e:
        logger.error(f"Erro ao atualizar status da tarefa {task_id} para o usuário {request.user_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'erro': 'Erro interno no servidor ao atualizar tarefa.'}), 500

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required # Protege esta rota
def deletar_tarefa(task_id):
    """
    Deleta uma tarefa específica do usuário logado.
    """
    try:
        # Busca a tarefa pelo ID e garante que ela pertence ao usuário logado
        tarefa = Tarefa.query.filter_by(id=task_id, usuario_id=request.user_id).first()

        if not tarefa:
            logger.warning(f"Tentativa de deletar tarefa {task_id} não encontrada ou não pertencente ao usuário {request.user_id}.")
            return jsonify({'erro': 'Tarefa não encontrada ou não pertence ao usuário.'}), 404

        db.session.delete(tarefa)
        db.session.commit()

        logger.info(f"Tarefa {task_id} deletada pelo usuário {request.user_id}.")
        return jsonify({'mensagem': 'Tarefa deletada com sucesso!'}), 200

    except Exception as e:
        logger.error(f"Erro ao deletar tarefa {task_id} para o usuário {request.user_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'erro': 'Erro interno no servidor ao deletar tarefa.'}), 500

# =============================================
# ROTA DE SAÚDE DO SERVIDOR
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
    # Inicia o servidor Flask em modo de depuração.
    # Em produção, 'debug=True' deve ser desativado.
    app.run(host='0.0.0.0', port=5000, debug=True)

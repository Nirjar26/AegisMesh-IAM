def withNodeTool(Closure body) {
    def nodeHome = tool(name: params.JENKINS_NODEJS_TOOL, type: 'nodejs')
    if (isUnix()) {
        withEnv(["PATH+NODE=${nodeHome}/bin"]) {
            body()
        }
    } else {
        withEnv(["PATH+NODE=${nodeHome}"]) {
            body()
        }
    }
}

def installNodeDependencies() {
    withNodeTool {
    if (fileExists('package-lock.json') || fileExists('npm-shrinkwrap.json')) {
        if (isUnix()) {
            sh 'npm ci --no-audit --no-fund'
        } else {
            bat 'call npm ci --no-audit --no-fund'
        }
    } else {
        if (isUnix()) {
            sh 'npm install --no-audit --no-fund'
        } else {
            bat 'call npm install --no-audit --no-fund'
        }
    }
    }
}

def runNpmScript(String scriptName) {
    withNodeTool {
        if (isUnix()) {
            sh "npm run ${scriptName}"
        } else {
            bat "call npm run ${scriptName}"
        }
    }
}

def buildDockerImage(String contextDir, String imageName, String imageTag) {
    def cmd = "docker build -t ${imageName}:${imageTag} ${contextDir}"
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(daysToKeepStr: '14', numToKeepStr: '30'))
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        booleanParam(name: 'RUN_DOCKER_BUILD', defaultValue: false, description: 'Build Docker images after tests pass')
        string(name: 'BACKEND_IMAGE', defaultValue: 'aegismesh/backend', description: 'Backend Docker image name')
        string(name: 'FRONTEND_IMAGE', defaultValue: 'aegismesh/frontend', description: 'Frontend Docker image name')
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag')
        string(name: 'JENKINS_NODEJS_TOOL', defaultValue: 'NodeJS_22', description: 'Name of configured Jenkins NodeJS tool installation')
    }

    environment {
        CI = 'true'
        NODE_ENV = 'test'
        DATABASE_URL = 'postgresql://ci_user:ci_password@localhost:5432/aegismesh_ci'
        FRONTEND_URL = 'http://localhost:5173'
        VITE_API_URL = 'http://localhost:5000/api'
        JWT_ACCESS_SECRET = 'ci-access-secret'
        JWT_REFRESH_SECRET = 'ci-refresh-secret'
        JWT_ACCESS_EXPIRY = '15m'
        JWT_REFRESH_EXPIRY = '7d'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Node Toolchain Check') {
            steps {
                script {
                    withNodeTool {
                        if (isUnix()) {
                            sh 'node --version && npm --version'
                        } else {
                            bat 'call node --version && call npm --version'
                        }
                    }
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Deps') {
                    steps {
                        dir('backend') {
                            script {
                                installNodeDependencies()
                            }
                        }
                    }
                }

                stage('Frontend Deps') {
                    steps {
                        dir('frontend') {
                            script {
                                installNodeDependencies()
                            }
                        }
                    }
                }
            }
        }

        stage('Validate and Build') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            script {
                                runNpmScript('test')
                            }
                        }
                    }
                }

                stage('Frontend Lint') {
                    steps {
                        dir('frontend') {
                            script {
                                runNpmScript('lint')
                            }
                        }
                    }
                }

                stage('Frontend Build') {
                    steps {
                        dir('frontend') {
                            script {
                                runNpmScript('build')
                            }
                        }
                    }
                }
            }
        }

        stage('Docker Build (Optional)') {
            when {
                expression {
                    return params.RUN_DOCKER_BUILD
                }
            }
            steps {
                script {
                    buildDockerImage('./backend', params.BACKEND_IMAGE, params.IMAGE_TAG)
                    buildDockerImage('./frontend', params.FRONTEND_IMAGE, params.IMAGE_TAG)
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'frontend/dist/**', allowEmptyArchive: true, fingerprint: true
        }
    }
}

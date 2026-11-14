pipeline {
  agent any
  options {
    timeout(time: 20, unit: 'MINUTES')
  }
  environment {
    COMPOSE_PROJECT_NAME = "ss${BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build and Start') {
      steps {
        sh '''
          export GATEWAY_PORT=$((18000 + BUILD_NUMBER % 1000))
          docker compose up -d --build
        '''
      }
    }
    stage('Smoke Test') {
      steps {
        sh '''
          PORT=$((18000 + BUILD_NUMBER % 1000))
          for i in 1 2 3 4 5 6 7 8 9 10; do
            curl -sf localhost:$PORT/health && break
            sleep 3
          done
          curl -sf localhost:$PORT/api/orders
          curl -sf localhost:$PORT/api/users
        '''
      }
    }
    stage('Security Scan') {
      steps {
        sh '''
          for svc in orders users gateway; do
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
              aquasec/trivy:0.58.0 image --severity HIGH,CRITICAL \
              --exit-code 0 --no-progress ${COMPOSE_PROJECT_NAME}-$svc
          done
        '''
      }
    }
  }
  post {
    always {
      sh 'docker compose down -v --rmi local || true'
    }
  }
}

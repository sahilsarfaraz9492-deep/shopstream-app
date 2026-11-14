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
      post {
        success { githubNotify context: 'ci/build', status: 'SUCCESS', description: 'Docker images built and started' }
        failure { githubNotify context: 'ci/build', status: 'FAILURE', description: 'Docker build failed - check the Dockerfile or code' }
      }
    }
    stage('Smoke Test') {
      steps {
        sh '''
          rm -f failed_path.txt
          PORT=$((18000 + BUILD_NUMBER % 1000))
          for path in health api/orders api/users; do
            ok=0
            for i in $(seq 1 15); do
              if curl -sf "localhost:$PORT/$path" > /dev/null; then ok=1; break; fi
              sleep 3
            done
            if [ "$ok" -ne 1 ]; then
              echo "SMOKE TEST FAILED: /$path"
              echo "$path" > failed_path.txt
              docker compose ps
              docker compose logs --tail 30
              exit 1
            fi
            echo "OK: /$path"
          done
        '''
      }
      post {
        success { githubNotify context: 'ci/smoke-test', status: 'SUCCESS', description: 'All 3 endpoints responded' }
        failure {
          script {
            def p = fileExists('failed_path.txt') ? readFile('failed_path.txt').trim() : 'unknown'
            githubNotify context: 'ci/smoke-test', status: 'FAILURE', description: "Endpoint not responding: /${p}"
          }
        }
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
      post {
        success { githubNotify context: 'ci/security-scan', status: 'SUCCESS', description: 'Trivy scan finished' }
        failure { githubNotify context: 'ci/security-scan', status: 'FAILURE', description: 'Security scan failed to run' }
      }
    }
  }
  post {
    always {
      sh 'docker compose down -v --rmi local || true'
    }
  }
}

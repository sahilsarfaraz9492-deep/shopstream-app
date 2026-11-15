pipeline {
  agent any
  options {
    timeout(time: 20, unit: 'MINUTES')
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Prepare') {
      steps {
        script {
          env.COMPOSE_PROJECT_NAME = sh(returnStdout: true, script: 'echo "ss$(echo "${JOB_NAME}-${BUILD_NUMBER}" | cksum | cut -d" " -f1)"').trim()
          env.GATEWAY_PORT = sh(returnStdout: true, script: 'echo $(( 20000 + $(echo "${JOB_NAME}-${BUILD_NUMBER}" | cksum | cut -d" " -f1) % 10000 ))').trim()
          echo "Project: ${env.COMPOSE_PROJECT_NAME}, port: ${env.GATEWAY_PORT}"
        }
      }
    }
    stage('Build and Start') {
      steps {
        sh 'docker compose up -d --build'
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
          for path in health api/orders api/users; do
            ok=0
            for i in $(seq 1 15); do
              if curl -sf "localhost:$GATEWAY_PORT/$path" > /dev/null; then ok=1; break; fi
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
    stage('Push to ECR') {
      when { branch 'main' }
      steps {
        withCredentials([
          string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh '''
            export AWS_DEFAULT_REGION=us-east-1
            AWS=/snap/bin/aws
            ACCOUNT=$($AWS sts get-caller-identity --query Account --output text)
            REGISTRY=$ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
            TAG=$(git rev-parse --short HEAD)
            $AWS ecr get-login-password | docker login --username AWS --password-stdin $REGISTRY
            for svc in orders users gateway; do
              docker tag ${COMPOSE_PROJECT_NAME}-$svc $REGISTRY/shopstream-$svc:$TAG
              docker tag ${COMPOSE_PROJECT_NAME}-$svc $REGISTRY/shopstream-$svc:latest
              docker push $REGISTRY/shopstream-$svc:$TAG
              docker push $REGISTRY/shopstream-$svc:latest
            done
            docker logout $REGISTRY
            echo "Pushed tag: $TAG"
          '''
        }
      }
      post {
        success { githubNotify context: 'ci/push', status: 'SUCCESS', description: 'Images pushed to ECR' }
        failure { githubNotify context: 'ci/push', status: 'FAILURE', description: 'ECR push failed - check AWS credentials and ECR repos' }
      }
    }
  }
  post {
    always {
      sh 'docker compose down -v --rmi local || true'
    }
    failure {
      withCredentials([string(credentialsId: 'discord-webhook', variable: 'DISCORD_URL')]) {
        sh '''
          curl -s -H "Content-Type: application/json" \
            -d "{\\"content\\":\\"BUILD FAILED: ${JOB_NAME} #${BUILD_NUMBER} - ${BUILD_URL}\\"}" \
            "$DISCORD_URL"
        '''
      }
    }
  }
}

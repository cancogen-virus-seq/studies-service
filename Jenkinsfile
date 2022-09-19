def dockerRepo = 'ghcr.io/cancogen-virus-seq/studies-service'
def githubRepo = 'cancogen-virus-seq/studies-service'
def commit = 'UNKNOWN'
def version = 'UNKNOWN'

String podSpec = '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:12.13.1
    tty: true
    securityContext:
      runAsUser: 1000
      runAsGroup: 1000
      fsGroup: 1000
  - name: dind-daemon
    image: docker:18.06-dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ''
    volumeMounts:
      - name: dind-storage
        mountPath: /var/lib/docker
  - name: docker
    image: docker:18-git
    command:
    - cat
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
    - name: HOME
      value: /home/jenkins/agent
    securityContext:
      runAsUser: 1000
      runAsGroup: 1000
      fsGroup: 1000
  volumes:
  - name: dind-storage
    emptyDir: {}
'''

pipeline {
  agent {
    kubernetes {
      label 'studies-service-executor'
      yaml podSpec
    }
  }
  stages {
    stage('Prepare') {
      steps {
        script {
          commit = sh(returnStdout: true, script: 'git describe --always').trim()
        }
        script {
          version = sh(returnStdout: true, script: 'cat ./package.json | grep version | cut -d \':\' -f2 | sed -e \'s/"//\' -e \'s/",//\'').trim()
        }
      }
    }

    stage('Build') {
      steps {
        container('node') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('Build & Publish Development Changes') {
      when {
        branch 'develop'
      }
      steps {
        container('docker') {
          withCredentials([usernamePassword(credentialsId:'argoContainers', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
            sh 'docker login ghcr.io -u $USERNAME -p $PASSWORD'
          }
          sh "docker build --network=host -f Dockerfile . -t ${dockerRepo}:${commit} -t ${dockerRepo}:edge"
          sh "docker push ${dockerRepo}:${commit}"
          sh "docker push ${dockerRepo}:edge"
        }
      }
    }

    stage('Release & Tag') {
      when {
        branch 'main'
      }
      steps {
        container('docker') {
          withCredentials([usernamePassword(credentialsId: 'argoGithub', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
            sh "git tag ${version}"
            sh "git push https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/${githubRepo} --tags"
          }

          withCredentials([usernamePassword(credentialsId:'argoContainers', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
            sh 'docker login ghcr.io -u $USERNAME -p $PASSWORD'
          }
          sh "docker build --network=host -f Dockerfile . -t ${dockerRepo}:${version} -t ${dockerRepo}:latest"
          sh "docker push ${dockerRepo}:${version}"
          sh "docker push ${dockerRepo}:latest"
        }
      }
    }

    stage('deploy to cancogen-virus-seq-dev') {
      when {
        anyOf {
          branch 'develop'
        }
      }
      steps {
        script {
          // we don't want the build to be tagged as failed because it could not be deployed.
          try {
            build(job: 'virusseq/update-app-version', parameters: [
              [$class: 'StringParameterValue', name: 'CANCOGEN_ENV', value: 'dev' ],
              [$class: 'StringParameterValue', name: 'TARGET_RELEASE', value: 'studies-service'],
              [$class: 'StringParameterValue', name: 'NEW_APP_VERSION', value: "${commit}" ]
            ])
          } catch (err) {
            echo 'The app built successfully, but could not be deployed'
          }
        }
      }
    }
  }
}

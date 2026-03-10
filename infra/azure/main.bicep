@description('Deployment location for all resources')
param location string = resourceGroup().location

@description('Environment label such as dev, staging, or prod')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Base workload name')
param workloadName string = 'reos'

@description('Linux runtime stack for App Service')
param linuxFxVersion string = 'PYTHON|3.11'

@description('Service Bus queue name for document ingestion')
param documentQueueName string = 'document-ingestion'

var appServicePlanName = '${workloadName}-${environment}-plan'
var appServiceName = '${workloadName}-${environment}-api'
var storageAccountName = toLower(replace('${workloadName}${environment}stg', '-', ''))
var blobContainerName = 'documents'
var serviceBusNamespaceName = '${workloadName}-${environment}-sb'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'P1v3'
    tier: 'PremiumV3'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      alwaysOn: true
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'REOS_RUNTIME_MODE'
          value: 'azure'
        }
        {
          name: 'REOS_AI_PROVIDER'
          value: 'azure_openai'
        }
      ]
    }
    httpsOnly: true
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: blobContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: serviceBusNamespaceName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

resource documentQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: documentQueueName
  properties: {
    maxDeliveryCount: 10
    deadLetteringOnMessageExpiration: true
    lockDuration: 'PT5M'
  }
}

@description('Attach API Management to this backend endpoint in APIM policy/config')
output apiBackendUrl string = 'https://${appService.properties.defaultHostName}'

@description('Use this storage account/container for production document binaries')
output blobStorageTarget string = '${storageAccount.name}/${documentsContainer.name}'

@description('Use this queue for async document processing workers')
output serviceBusQueue string = '${serviceBusNamespace.name}/${documentQueue.name}'

@description('Front Door, Application Gateway, and API Management are intentionally modeled outside this starter template')
output enterpriseEdgeIntegrationNote string = 'Configure Front Door -> App Gateway -> API Management -> App Service routing in platform-managed templates.'

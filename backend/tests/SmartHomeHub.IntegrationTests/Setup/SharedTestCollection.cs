namespace SmartHomeHub.IntegrationTests.Setup;

// A propriedade DisableParallelization garante que os testes não entrem em concorrência
// ao tentar ler ou apagar dados do PostgreSQL ao mesmo tempo.
[CollectionDefinition("ExtensionsCollection", DisableParallelization = true)]
public class SharedTestCollection : ICollectionFixture<IntegrationTestWebAppFactory>
{
    // This class contains no code.
    // It serves only as a marker decorated with the xUnit interface.
}

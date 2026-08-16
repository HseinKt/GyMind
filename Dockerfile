# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Gymind.API/Gymind.API.csproj Gymind.API/
RUN dotnet restore Gymind.API/Gymind.API.csproj

COPY . .
RUN dotnet publish Gymind.API/Gymind.API.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "Gymind.API.dll"]
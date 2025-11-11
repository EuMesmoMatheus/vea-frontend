#!/bin/bash

# Script para deletar componentes obsoletos no Angular (appointments, employees, services)
# Cria backup em _backup/ antes de deletar
# Atualiza app.routes.ts removendo imports e rotas

echo "🧹 Iniciando limpeza de componentes inúteis..."

# 1. Cria pasta de backup se não existir
mkdir -p _backup

# 2. Deleta arquivos dos componentes (com backup)
components=("appointments" "employees" "services")

for comp in "${components[@]}"; do
  ts_file="src/app/pages/$comp/$comp.component.ts"
  html_file="src/app/pages/$comp/$comp.component.html"
  css_file="src/app/pages/$comp/$comp.component.css"

  # Backup se arquivo existir
  if [ -f "$ts_file" ]; then
    cp "$ts_file" "_backup/${comp}.component.ts.backup"
    rm "$ts_file"
    echo "✅ Deletado: $ts_file (backup em _backup)"
  fi
  if [ -f "$html_file" ]; then
    cp "$html_file" "_backup/${comp}.component.html.backup"
    rm "$html_file"
    echo "✅ Deletado: $html_file (backup em _backup)"
  fi
  if [ -f "$css_file" ]; then
    cp "$css_file" "_backup/${comp}.component.css.backup"
    rm "$css_file"
    echo "✅ Deletado: $css_file (backup em _backup)"
  fi

  # Deleta pasta vazia se sobrar
  rmdir "src/app/pages/$comp" 2>/dev/null || true
done

# 3. Atualiza app.routes.ts (remove imports e rotas)
routes_file="src/app/app.routes.ts"  # Ajusta se o nome for diferente

if [ -f "$routes_file" ]; then
  # Backup do routes
  cp "$routes_file" "_backup/app.routes.ts.backup"

  # Remove imports desnecessários (usa sed para limpar linhas específicas)
  sed -i '/import { EmployeesComponent }/d' "$routes_file"
  sed -i '/import { ServicesComponent }/d' "$routes_file"
  sed -i '/import { AppointmentsComponent }/d' "$routes_file"

  # Remove rotas children desnecessárias no admin (deixa só general)
  sed -i '/employees.*component: EmployeesComponent/d' "$routes_file"
  sed -i '/services.*component: ServicesComponent/d' "$routes_file"

  # Remove rota appointments fora do admin
  sed -i '/appointments.*component: AppointmentsComponent/d' "$routes_file"

  echo "✅ Atualizado: $routes_file (imports e rotas removidos; backup em _backup)"
else
  echo "⚠️ Arquivo $routes_file não encontrado – ajusta manualmente!"
fi

# 4. Limpa pastas vazias opcionais
find src/app/pages -type d -empty -delete 2>/dev/null || true

echo "🎉 Limpeza finalizada! Rode 'ng serve' pra testar."
echo "Backups salvos em _backup/ (deleta se quiser)."
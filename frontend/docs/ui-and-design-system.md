# 🎨 Diretrizes de UI, Espaçamento e Design System

## 1. Ritmo Vertical e Agrupamento Proporcional (8px Grid)

Para garantir consistência visual e hierarquia clara entre formulários e painéis:

| Relação Visual | Espaçamento | Classes Tailwind |
|---|---|---|
| **Label ⇄ Input** | 4px a 6px | `gap-1.5` ou `space-y-1.5` |
| **Input ⇄ Mensagem de Erro** | 4px | `mt-1` |
| **Campos da mesma Seção** | 12px a 16px | `space-y-3` a `space-y-4` |
| **Entre Seções/Categorias** | 24px a 32px | `space-y-6` a `space-y-8` |

### 1.1. Prevenção de Layout Shift (CLS) em Erros de Validação
Mensagens de validação que surgem repentinamente causam pulos na interface (*Cumulative Layout Shift*).

- **Padrão:** Reserve a área da mensagem com `min-h-[18px]` ou `min-h-[20px]` na tag de erro em vez de renderizar condicionalmente containers de altura fixa desproporcionais.

---

## 2. Padrão de Modais e Sheets de Domínio

- Telas com cadastros de alta densidade (ex: `CreateRoomSheet`, `EditDeviceSheet`) utilizam componentes laterais do tipo **Sheet (Drawer lateral)** para não perder o contexto da tabela/dashboard ao fundo.
- **Carregamento Visual:** Listas e cards devem utilizar **Skeletons** proporcionais à estrutura final em vez de *spinners* soltos centralizados.
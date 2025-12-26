from django.contrib import admin
from .models import MateriaPrima, InformacionNutricional, LimiteNormativo, FuncionTecnologica

# 1. Inline de Nutrición (Para que aparezca DENTRO de la Materia Prima)
class InformacionNutricionalInline(admin.StackedInline):
    model = InformacionNutricional
    can_delete = False
    verbose_name_plural = 'Perfil Nutricional (por 100g)'

# 2. Admin de Materia Prima
@admin.register(MateriaPrima)
class MateriaPrimaAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'densidad', 'costo_kilo', 'activo')
    search_fields = ('codigo', 'nombre') # CRÍTICO para el autocompletado en el formulador
    list_filter = ('activo',)
    inlines = [InformacionNutricionalInline] # Aquí insertamos la nutrición
    
    fieldsets = (
        ('Identificación', {
            'fields': ('codigo', 'nombre', 'activo')
        }),
        ('Datos Críticos de Cálculo', {
            'fields': ('densidad', 'costo_kilo'),
            'description': 'La densidad es fundamental para la conversión de Volumen a Masa en las fórmulas.'
        }),
    )

# 3. Admin de Funciones (Simple)
@admin.register(FuncionTecnologica)
class FuncionTecnologicaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

# 4. Admin de Límites Normativos (Scraping)
@admin.register(LimiteNormativo)
class LimiteNormativoAdmin(admin.ModelAdmin):
    list_display = ('codigo_ins', 'nombre_aditivo', 'limite_maximo_ppm', 'categoria_alimento')
    search_fields = ('codigo_ins', 'nombre_aditivo')
    list_filter = ('categoria_alimento',)
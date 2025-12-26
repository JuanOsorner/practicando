from django.contrib import admin
from .models import Producto, ItemFormula, HistorialFichas

# 1. Inline de Ingredientes (La "Planilla Excel")
class ItemFormulaInline(admin.TabularInline):
    model = ItemFormula
    fk_name = "producto_padre"  # <--- ¡AGREGA ESTA LÍNEA!
    extra = 1 # Muestra una fila vacía lista para llenar
    
    # Optimizaciones de interfaz
    autocomplete_fields = ['materia_prima', 'sub_producto', 'norma_asociada'] 
    classes = ['collapse'] # Permite colapsar si la fórmula es muy larga
    
    fields = ('materia_prima', 'sub_producto', 'cantidad_porcentaje', 'porcentaje_uso', 'funcion', 'norma_asociada')

# 2. Inline de Historial de PDFs
class HistorialFichasInline(admin.TabularInline):
    model = HistorialFichas
    extra = 0
    readonly_fields = ('fecha_subida', 'usuario_responsable')
    can_delete = False # Por seguridad, no borrar historial fácilmente

    def has_add_permission(self, request, obj=None):
        return False # Los PDFs se añaden por proceso, no manual (opcional, por ahora false)

# 3. Admin Principal del Producto
@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'version_actual', 'estado', 'cantidad_base_lote', 'creado_por')
    list_filter = ('estado', 'creado_por')
    search_fields = ('codigo', 'nombre')
    
    # Aquí integramos las tablas hijas
    inlines = [ItemFormulaInline, HistorialFichasInline]
    
    # Agrupación visual de campos
    fieldsets = (
        ('Encabezado de Ficha', {
            'fields': ('codigo', 'nombre', 'version_actual', 'estado', 'creado_por')
        }),
        ('Variables Matemáticas Globales', {
            'fields': (('cantidad_base_lote', 'densidad_teorica'),),
            'description': 'Estos valores afectan el cálculo total del lote (Verde) y la densidad para subproductos (Morado).'
        }),
    )
    
    # Auditoría automática: Al guardar, asigna el usuario actual
    def save_model(self, request, obj, form, change):
        if not obj.pk: # Si es nuevo
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)
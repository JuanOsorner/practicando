document.addEventListener("DOMContentLoaded", async ()=>{
    // Esperamos a que se cargue la pagina

    // Lo primero que vamos a hacer es traer nuestros usuarios del backend

    /**
     * Esta funcion toma una url e intenta hacer una petición al back
     * @param {string} url 
     * @returns datos
     */
    async function cargarDatos(url) {
        try{
            const respuesta = await fetch(url)
            const datos = await respuesta.json()
            if(datos.status !== 'success'){
                alert(datos.mensaje)
                return false;
            }else{
                return datos.datos
            }
        }catch(e){
            alert("Error de respuesta del servidor",e)
            return false
        }
    }
    
    const data = await cargarDatos('/api/usuarios');
    
    // Validamos que si exista la data
    if(data){
        let grid = new ej.grids.Grid({
            dataSource: data,
            height: 300,
            allowPaging: true,
            pageSettings: { pageSize: 3 },
            columns: [
                { field: 'id', headerText: 'ID', width: 60, textAlign: 'Right' },
                { field: 'nombre', headerText: 'Nombre', width: 120 },
                { field: 'apellido', headerText: 'Apellido', width: 120 },
                { field: 'email', headerText: 'Email', width: 200 },
                { field: 'estado', headerText: 'Estado', width: 100 },
                { field: 'rol', headerText: 'Rol', width: 100 },
            ]
        });
        grid.appendTo('#grid');
    }else{
        alert("No llegaron datos");
    }
});
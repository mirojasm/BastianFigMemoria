const getUsuarios = async () => {
     try {
       const response = await fetch('http://localhost:3001/api/usuarios', {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           // Si tu API requiere autenticación, añade el header de autorización aquí
           // 'Authorization': 'Bearer ' + tuTokenJWT
         },
       });
   
       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }
   
       const usuarios = await response.json();
       console.log('Usuarios obtenidos:', usuarios);
       return usuarios;
     } catch (error) {
       console.error('Error al obtener usuarios:', error);
       throw error;
     }
   };
   
   // Uso de la función
   getUsuarios()
     .then(usuarios => {
       // Aquí puedes hacer algo con los usuarios obtenidos
       // Por ejemplo, actualizar el estado de tu componente React
       console.log(usuarios);
     })
     .catch(error => {
       // Manejo de errores
       console.error('Hubo un problema con la petición fetch:', error);
     });
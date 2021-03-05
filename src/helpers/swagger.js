module.exports = {
  swaggerDefinition: {
    info: {
      title: "Loca",
      description: "Node.js REST - API.",
      contact: {
        name: "Logic Fab",
        email: "fakhar.abbas@logicfab.co",
      },
      servers: ["http://localhost:5055", "https://loca-api.herokuapp.com"],
    },
  },
  apis: ["src/routes/*.js", "src/routes/*/*.js"],
};

const express = require("express");
const path = require("path");
const date = require("date-fns");
const format = require("date-fns/format");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
//const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const checkStatus = (requestObj) => {
  return requestObj.status !== undefined;
};

const checkPriority = (requestObj) => {
  return requestObj.priority !== undefined;
};

const checkStatusAndPriority = (requestObj) => {
  return requestObj.status !== undefined && requestObj.priority !== undefined;
};

const checkSearch_q = (requestObj) => requestObj.search_q !== undefined;

const checkStatusAndCategory = (requestObj) => {
  return requestObj.status !== undefined && requestObj.category !== undefined;
};

const checkCategoryAndPriority = (requestObj) => {
  return requestObj.priority !== undefined && requestObj.category !== undefined;
};

const checkCategory = (requestObj) => requestObj.category !== undefined;

const priorityValArr = ["HIGH", "MEDIUM", "LOW"];
const statusValArr = ["TO DO", "IN PROGRESS", "DONE"];
const categoryValArr = ["WORK", "HOME", "LEARNING"];

const statusValIncludes = (status) => {
  return statusValArr.includes(status);
};

const priorityValIncludes = (priority) => {
  return priorityValArr.includes(priority);
};

const categoryValIncludes = (category) => {
  return categoryValArr.includes(category);
};

app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q = "" } = request.query;
  let query;
  let dbResponse;
  switch (true) {
    case checkStatusAndPriority(request.query):
      if (statusValIncludes(status)) {
        if (priorityValIncludes(priority)) {
          query = `
                select * from todo 
                where todo like '%${search_q}%' AND 
                priority = '${priority}' AND 
                status = '${status}'
            `;
          dbResponse = await db.all(query);
          response.send(dbResponse);
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case checkStatusAndCategory(request.query):
      if (statusValIncludes(status)) {
        if (categoryValIncludes(category)) {
          query = `
                select * from todo 
                where todo like '%${search_q}%' AND 
                category = '${category}' AND 
                status = '${status}'
            `;
          dbResponse = await db.all(query);
          response.send(dbResponse);
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case checkCategoryAndPriority(request.query):
      if (categoryValIncludes(category)) {
        if (priorityValIncludes(priority)) {
          query = `
                select * from todo 
                where todo like '%${search_q}%' AND 
                category = '${category}' AND 
                priority = '${priority}'
            `;
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    case checkStatus(request.query):
      if (statusValIncludes(status)) {
        query = `
                select * from todo 
                where todo like '%${search_q}%' AND 
                status = '${status}'
            `;
        dbResponse = await db.all(query);
        response.send(dbResponse);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case checkPriority(request.query):
      if (priorityValIncludes(priority)) {
        query = `
                select * from todo 
                where todo like '%${search_q}%' AND 
                priority = '${priority}'
            `;
        dbResponse = await db.all(query);
        response.send(dbResponse);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case checkCategory(request.query):
      if (checkCategory(category)) {
        query = `
                select * from todo 
                where todo like '%${search_q}%' AND 
                category = '${category}'
            `;
        dbResponse = await db.all(query);
        response.send(dbResponse);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case checkSearch_q(request.query):
      query = `
                select * from todo 
                where todo like '%${search_q}%'
            `;
      break;
  }
});

app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        select 
        id,
        todo,
        priority,
        status,
        category,
        due_date as dueDate
         from todo where id = ${todoId}
    `;
  const dbResponse = await db.get(getTodoQuery);
  response.send(dbResponse);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const formatDate = format(new Date(date), "yyyy-MM-dd");
  const dateQuery = `
        select * from todo where due_date = '${date}'
    `;
  const dbResponse = await db.all(dateQuery);
  response.send(dbResponse);
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const updateQuery = `
        insert into todo(id,
        todo,
        priority,
        status,
        category,
        due_date)
        values(
            '${id}',
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${dueDate}'
        )
    `;
  await db.run(updateQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        select
        todo,
        priority,
        status,
        category,
        due_date as dueDate
        from todo
        where id = ${todoId}
    `;
  const dbResponse = await db.get(getTodoQuery);

  const {
    status = dbResponse.status,
    priority = dbResponse.priority,
    todo = dbResponse.todo,
    category = dbResponse.category,
    dueDate = dbResponse.dueDate,
  } = request.body;
  let query;
  let currentUpdate;
  switch (true) {
    case request.body.status !== undefined:
      query = `
            update todo set status = '${status}'
          `;
      currentUpdate = "Status";
      break;
    case request.body.priority !== undefined:
      query = `
            update todo set priority = '${priority}'
          `;
      currentUpdate = "Priority";
      break;
    case request.body.todo !== undefined:
      query = `
            update todo set todo = '${todo}'
          `;
      currentUpdate = "Todo";
      break;
    case request.body.category !== undefined:
      query = `
            update todo set category = '${category}'
          `;
      currentUpdate = "Todo";
      break;
    case request.body.dueDate !== undefined:
      query = `
            update todo set due_date = '${dueDate}'
          `;
      currentUpdate = "Due Date";
      break;
  }
  const dbUpdate = await db.run(query);
  response.send(`${currentUpdate} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodo = `
    delete from todo where id = ${todoId}
  `;
  const dbResponse = await db.get(deleteTodo);
  response.send("Todo Deleted");
});

module.exports = app;

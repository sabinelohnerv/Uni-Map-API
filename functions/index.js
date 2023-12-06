/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const express = require("express");
const app = express();
const db = admin.firestore();

const cors = require("cors");
app.use(cors({origin: true}));

// ----------------------------------POST---------------------------------------
// Create a new building
app.post("/create/building", (req, res) => {
  (async () => {
    try {
      await db.collection("buildings").doc("/" + req.body.id + "/")
          .create(
              {
                name: req.body.name,
                description: req.body.description,
                location: req.body.location,
              },
          );
      return res.status(201).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// Create a new room for a building
app.post("/create/building/:id/room", async (req, res) => {
  try {
    const buildingId = req.params.id;

    await db.collection("buildings").doc(buildingId).collection("rooms").doc("/" + req.body.id + "/").create(
        {
          name: req.body.name,
          level: req.body.level,
        },
    );

    return res.status(201).send();
  } catch (error) {
    console.log(error);
    return res.status(500).send({message: "Error creating new room", error: error});
  }
});

// Create multiple new rooms for a building
app.post("/create/building/:id/rooms", async (req, res) => {
  try {
    const buildingId = req.params.id;
    const rooms = req.body;

    if (!Array.isArray(rooms)) {
      return res.status(400).send({message: "The request body must be an array of rooms."});
    }

    const batch = db.batch();

    rooms.forEach((room) => {
      if (!room.id || !room.name || !room.level) {
        throw new Error("Missing room id, name, or level for one of the rooms.");
      }
      const roomRef = db.collection("buildings").doc(buildingId).collection("rooms").doc(room.id);
      batch.set(roomRef, {
        name: room.name,
        level: room.level,
      });
    });

    await batch.commit();

    return res.status(201).send({message: "Rooms created successfully"});
  } catch (error) {
    console.log(error);
    return res.status(500).send({message: "Error creating new rooms", error: error});
  }
});

// ----------------------------------GET----------------------------------------
// Building by ID
app.get("/buildings/:id", (req, res) => {
  (async () => {
    try {
      const document = db.collection("buildings").doc(req.params.id);
      const building = await document.get();
      const response = building.data();

      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// All buildings
app.get("/buildings", async (req, res) => {
  try {
    const query = db.collection("buildings");
    const response = [];

    const querySnapshot = await query.get();
    const docs = querySnapshot.docs;

    for (const doc of docs) {
      const selectedItem = {
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        location: doc.data().location,
      };
      response.push(selectedItem);
    }

    return res.status(200).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// All ground areas
app.get("/areas", async (req, res) => {
  try {
    const query = db.collection("areas");
    const response = [];

    const querySnapshot = await query.get();
    const docs = querySnapshot.docs;

    for (const doc of docs) {
      const selectedItem = {
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        location: doc.data().location,
      };
      response.push(selectedItem);
    }

    return res.status(200).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Ground area by id
app.get("/areas/:id", (req, res) => {
  (async () => {
    try {
      const document = db.collection("areas").doc(req.params.id);
      const building = await document.get();
      const response = building.data();

      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// Rooms by building
app.get("/buildings/:id/rooms", async (req, res) => {
  try {
    const buildingId = req.params.id;
    const roomsQuery = db.collection("buildings").doc(buildingId).collection("rooms");
    const response = [];

    const querySnapshot = await roomsQuery.get();

    if (querySnapshot.empty) {
      return res.status(404).send({message: "No rooms found for the given building ID"});
    }

    querySnapshot.forEach((doc) => {
      const room = doc.data();
      room.id = doc.id;
      response.push(room);
    });

    return res.status(200).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Areas by building
app.get("/buildings/:id/areas", async (req, res) => {
  try {
    const buildingId = req.params.id;
    const roomsQuery = db.collection("buildings").doc(buildingId).collection("common_areas");
    const response = [];

    const querySnapshot = await roomsQuery.get();

    if (querySnapshot.empty) {
      return res.status(404).send({message: "No areas found for the given building ID"});
    }

    querySnapshot.forEach((doc) => {
      const room = doc.data();
      room.id = doc.id;
      response.push(room);
    });

    return res.status(200).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Rooms by building by level
app.get("/buildings/:id/rooms/level/:level", async (req, res) => {
  try {
    const buildingId = req.params.id;
    const level = req.params.level;
    let levelParam;

    if (level == "pb") {
      levelParam = "PLANTA BAJA";
    } else {
      levelParam = `PISO ${level}`;
    }

    const roomsQuery = db.collection("buildings").doc(buildingId).collection("rooms").where("level", "==", levelParam);
    const response = [];

    const querySnapshot = await roomsQuery.get();

    if (querySnapshot.empty) {
      return res.status(404).send({message: "No rooms found for the given building ID and level"});
    }

    querySnapshot.forEach((doc) => {
      const room = {
        id: doc.id,
        ...doc.data(),
      };
      response.push(room);
    });

    return res.status(200).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send({message: "Error retrieving rooms", error: error});
  }
});

// Search Endpoint
app.get("/search", async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.status(400).send({message: "Search query is required"});
    }

    const [areasResponse, buildingsResponse] = await Promise.all([
      searchAreas(searchQuery),
      searchBuildings(searchQuery),
    ]);

    return res.status(200).send({areas: areasResponse, buildings: buildingsResponse});
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

async function searchAreas(query) {
  const areasQuerySnapshot = await db.collection("areas").get();
  const filteredDocs = areasQuerySnapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.name.includes(query) || data.type.includes(query);
  });
  return filteredDocs.map((doc) => ({id: doc.id, ...doc.data()}));
}

function startsWithAnyOf(query, prefixes) {
  return prefixes.some((prefix) => query.startsWith(prefix));
}

async function searchBuildings(query) {
  const buildingsQuery = db.collection("buildings");
  const buildingsSnapshot = await buildingsQuery.get();
  const buildingsResponse = [];
  const prefixes = ["T-", "PG-", "MA-", "MB-", "G-", "L-"];

  for (const doc of buildingsSnapshot.docs) {
    const buildingData = doc.data();
    if (buildingData.name.includes(query) || buildingData.description.includes(query)) {
      buildingsResponse.push({id: doc.id, ...buildingData});
      continue;
    }

    if (startsWithAnyOf(query, prefixes)) {
      if (buildingData.prefix && query.startsWith(buildingData.prefix)) {
        const roomsResponse = await searchSubCollection(doc.ref, "rooms", query, true);
        if (roomsResponse.length > 0) {
          buildingsResponse.push({id: doc.id, ...buildingData, rooms: roomsResponse});
        }
      }
    } else {
      const commonAreasResponse = await searchSubCollection(doc.ref, "common_areas", query);
      if (commonAreasResponse.length > 0) {
        buildingsResponse.push({id: doc.id, ...buildingData, commonAreas: commonAreasResponse});
      }
    }
  }

  return buildingsResponse;
}

async function searchSubCollection(parentRef, subCollectionName, query, searchById = false) {
  const subQuery = parentRef.collection(subCollectionName);
  const subQuerySnapshot = await subQuery.get();
  return subQuerySnapshot.docs
      .filter((doc) => {
        const data = doc.data();
        return searchById ? doc.id.includes(query) : data.name.includes(query) || data.type.includes(query);
      })
      .map((doc) => ({id: doc.id, ...doc.data()}));
}


exports.app = functions.https.onRequest(app);

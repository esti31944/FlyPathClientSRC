
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GoogleMap,
  Marker,
} from "@react-google-maps/api";


const mapContainerStyle = {
  width: "100vw",
  height: "100vh",
};

const containerStyle = {
  width: "100%",
  height: "400px",
};

const center = {
    lat: 32.05,
    lng: 34.94,
};

const New1Map = () => {

  const [markers, setMarkers] = useState([]);

  const [isCalculating, setIsCalculating] = useState(false);

  const navigate = useNavigate();

  const handleMapClick = (event) => {
    if (markers.length >= 2) {
      setMarkers([]); // איפוס נקודות אם יש כבר התחלה וסיום
    }

    setMarkers((current) => [
      ...current,
      {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      },
    ]);
  };

  const handleShowPath = async () => {
    if (markers.length !== 2) {
      alert("יש לבחור נקודת התחלה ונקודת סיום.");
      return;
    }

    setIsCalculating(true);

    const [start, goal] = markers;
    
    const altStart = 120, altGoal = 120;

    localStorage.setItem(
      "Locations"
      ,JSON.stringify({
        start:{lat:start.lat,lng:start.lng,alt:altStart},
        goal:{ lat: goal.lat, lng: goal.lng,alt:altGoal},
      })
    );

    try {
      const response = await fetch("https://localhost:7068/api/Route/startRoute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: { x: start.lat, y: start.lng,z:altStart },
          goal: { x: goal.lat, y: goal.lng,z:altGoal  },
        }),
      });

      if (!response.ok) {
        throw new Error("שגיאה בשליחת הבקשה לשרת.");
      }

      const data = await response.json();


      const converted = data.map(p => ({
        lat: p.x ?? p.lat,
        lng: p.y ?? p.lng,
        alt: p.z ?? p.alt
      }));
      localStorage.setItem("plannedPath", JSON.stringify(converted));

      console.log(JSON.stringify(converted));

      navigate("/NewMapView2");
    } catch (error) {
      console.error("שגיאה:", error);
      alert("אירעה שגיאה בעת קבלת המסלול מהשרת.");
    }finally{
      setIsCalculating(false);
    }
  };

  if (!window.google) return <div>טוען מפה...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '10px' }}>בחר את נקודת ההתחלה והיעד</h2>
      <div style={{ marginBottom: '10px' }}>
        {isCalculating ? (
          <span>מחשב מסלול...</span>
        ) : (
          <button onClick={handleShowPath}>הצג מסלול</button>
        )}
      </div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        onClick={handleMapClick}
      >
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} label={index === 0 ? "Start" : "Goal"} />
        ))}
      </GoogleMap>
    </div>
  );
};

export default New1Map;
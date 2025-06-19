
import React, { useEffect, useState,useRef } from "react";

import { GoogleMap, Polyline, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "90vh",
};

const getBlueByAltitude = (alt) => {
  const minAlt = 90;
  const maxAlt = 110;
  const ratio = Math.min(Math.max((alt - minAlt) / (maxAlt - minAlt), 0), 1);
  const blue = 255;
  const red = Math.floor(100 * (1 - ratio));
  const green = Math.floor(150 * ratio);
  return `rgb(${red}, ${green}, ${blue})`;
  
};

const ReachedGoal = (current, goal) => {
  const distance = Math.sqrt(
    Math.pow(current.lat - goal.lat, 2) +
    Math.pow(current.lng - goal.lng, 2) +
    Math.pow((current.alt || 0) - (goal.alt || 0), 2)
  );
  return distance < 0.00005; // סף קרבה קטן (בערך 5 מטרים)
};

const translateStatusToHebrew = (status) => {
  switch (status) {
    case "Idle":
      return "לא התחיל";
    case "Takeoff":
      return "בהמראה";
    case "Cruising":
      return "ברחיפה";
    case "Landing":
      return "בנחיתה";
    case "Finished":
      return "סיים";
    default:
      return "מצב לא ידוע";
  }
};

export default function NewMapView2() {
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [plannedPath, setPlannedPath] = useState([]);
  const [dronePath, setDronePath] = useState([]);
  const [dronePosition, setDronePosition] = useState(null);
  const [started, setStarted] = useState(false);

  const [flightStatus, setFlightStatus] = useState("לא התחיל");
  const [hasStartedOnce, setHasStartedOnce] = useState(false);

  const hasReachedGoalRef = useRef(false);
  const dronePathRef = useRef([]);

  const statusIntervalRef = useRef(null);


  useEffect(() => {
    const path = localStorage.getItem("plannedPath");
    if (path) {
      setPlannedPath(JSON.parse(path));
    }
  }, []);

  const fetchFlightStatus = async () => {
    fetch("https://localhost:7068/api/Route/status")
    .then((res) => {
      if (!res.ok) throw new Error("שגיאה בבקשת סטטוס");
      return res.text();
    })
    .then((status) => {
      console.log("סטטוס:", `[${status}]`);
      setFlightStatus(status.trim());
    })
    .catch((err) => {
      console.error("שגיאה בהבאת סטטוס", err);
    });
  };

  useEffect(() => {

    if (!started) return;

    statusIntervalRef.current = setInterval(() => {
      fetchFlightStatus();
    }, 300);
  
    return () => clearInterval(statusIntervalRef.current);
  }, [started]);
  
  useEffect(() => {
    if (flightStatus === "Finished") {
      console.log("סטטוס: סיום – עוצרים סטטוס ומיקום");
      clearInterval(statusIntervalRef.current); // מפסיקים לקרוא סטטוס
      setStarted(false); // מבטל גם קריאת מיקום
    }
  }, [flightStatus]);  


  useEffect(() => {
    if (!started) return;

    const startRealTime = async () => {
      console.log("startRealTime התחיל");
      try {
        const locations_ = localStorage.getItem("Locations");
        const { start, goal } = JSON.parse(locations_);
  
        const res = await fetch("https://localhost:7068/api/Route/startRealTime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Start: { X: start.lat, Y: start.lng, Z: start.alt },
            Goal: { X: goal.lat, Y: goal.lng, Z: goal.alt },
          }),
        });
  
        if (!res.ok) throw new Error("Start failed");

        const fullServerPath = await res.json();

        console.log("fullServerPath: ",fullServerPath);

        // אתחול המסלול
        const startPoint = {
          lat: start.lat,
          lng: start.lng,
          alt: start.alt,
        };
        dronePathRef.current = [startPoint];
        setDronePath(dronePathRef.current);
        setDronePosition(startPoint);

        const interval = setInterval(() => {
          fetch("https://localhost:7068/api/Route/getPosition")
            .then((res) => {
              if (!res.ok) throw new Error("שגיאה בקריאת נקודה");
              return res.json();
            })
            .then((point) => {
              if (!point) {
                setStarted(false);
                clearInterval(interval);
                return;
              }
  
              const mappedPoint = {
                lat: point.x,
                lng: point.y,
                alt: point.z,
              };
             
              dronePathRef.current = [...dronePathRef.current, mappedPoint];
              setDronePath(dronePathRef.current);
              setDronePosition(mappedPoint);            
              
              // בדיקה אם הגענו ליעד
              const { goal } = JSON.parse(localStorage.getItem("Locations") || "{}");
              if (goal && ReachedGoal(mappedPoint, goal)) {
                if (!hasReachedGoalRef.current) {
                hasReachedGoalRef.current = true; // למנוע כניסות חוזרות
                  clearInterval(interval);
                  setStarted(false);
                  alert("הרחפן הגיע ליעד!");
                  
                  // במידה ולא נשלפו כל הנקודות – נשלים מהשרת
                  setDronePath((prev) => {
                  
                    if (fullServerPath && fullServerPath.length > 0) {
                      const fullPath = fullServerPath.map(p => ({
                        lat: p.x,
                        lng: p.y,
                        alt: p.z,
                      }));
                      dronePathRef.current = fullPath;
                      setDronePath(fullPath);
                    }                    

                    return prev;
                  });
                }
              }

            })
            .catch((err) => {
              console.error("שגיאה בקבלת נקודה הבאה", err);
              clearInterval(interval);
              setStarted(false);
            });
        }, 10);
  
        return () => clearInterval(interval);
      } catch (error) {
        console.error("שגיאה בהפעלת startRealTime", error);
        setStarted(false);
      }
    };
  
    startRealTime();
  }, [started]);

 

  const pathWithColors = plannedPath.map((point, index) => ({
    lat: point.lat,
    lng: point.lng,
    color: getBlueByAltitude(point.alt),
  }));

  if (!window.google) return <div>טוען מפה...</div>;

  return (
    <div>
    {hasStartedOnce &&(
    <div style={{ padding: "10px", fontSize: "18px", fontWeight: "bold" }}>
      מצב הרחפן: {translateStatusToHebrew(flightStatus)}
    </div>
    )}

    <div style={{ padding: "10px" }}>
      {isButtonVisible &&(
      <button onClick={() => {setStarted(true);
        setHasStartedOnce(true);
         setIsButtonVisible(false);
         }} disabled={started}>
        צא לדרך
      </button>)}
    </div>
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={dronePosition || plannedPath[0]}
      zoom={12}
    >
      {/* מסלול כחול בגוונים */}
      {pathWithColors.length >= 2 &&
        pathWithColors.map((point, i) => {
          if (i === 0) return null;
          return (
            <Polyline
              key={`planned-${i}`}
              path={[pathWithColors[i - 1], point]}
              options={{
               
                strokeColor: point.color,
                strokeOpacity: 1,
                strokeWeight: 4,
                geodesic: true,
                zIndex: 1
              }}
            />
          );
        })}

      {/* מסלול ירוק של הרחפן */}
      {dronePath.length >= 2 && (
        <Polyline
          path={dronePath}
          
          options={{ 
             strokeColor: "green",
             strokeWeight: 4,
             zIndex: 10
            }}
        />
      )}

      {/* הרחפן */}
      {dronePosition && (
        <Marker position={dronePosition}
         icon={{ 
          url: "https://img.icons8.com/ios-filled/50/drone.png",
          scaledSize: new window.google.maps.Size(30, 30) 
        }} 
         />
      )}
    </GoogleMap>
  </div>
  );
}


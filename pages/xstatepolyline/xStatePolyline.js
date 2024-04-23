import Konva from "konva";
import { createMachine, interpret } from "xstate";


const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 11;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QCcCuAjdZkCFkEMA7CAS0KgDoSIAbMAYgFkB5AVQGUBRAYQBkBJbgGkA2gAYAuolAAHAPawSAFxJzC0kAA9EAFgCsAJgoBOU8YAcegIwB2AMzmdYuwBoQAT0TmrFA2dNi5jZiOnZWxgC+EW5omNh4RKTkFAAiBADuZFBMbFwsAGqc4lJIIPKKKmoa2gh6YhQ63gZ6OjYG7cZ6LQBsbp4IBjY2FHY2OhbGjVaDBvpRMRhYuATEWakZWTkcnAVFViWyCsqq6qU1dnbGFN3NYgbmjmJ69uZ9iLbd1+OdhqbdYzd5iBYksEqtkml8JlyFsuHxBKJJBpyscqmd3ncKFZRnU7N1AmNjPc3ggrOYjHdxuY7hdumSukCQfEVklKJDodkcPgAMYAa1gMh5YGKyKOlVOoBqOgMJPMn3+42CFj0xm6Om6ekZi2ZiTW7M2nEISmwItKKPF1UQFyuNzq90ezwcJMGPn8apa9nuDOiwO1y11EI2MM4sG5+BkwqRZrFJ0tCGt11u9qcjteHit-xG33sNkmFmaUR9hDkEDgGiZ-vBUFFFVj6IQAFpeunG90tXFK6yqLQwDXURKtIhbSM6mIxP9VcYrF1nUSKM9xt87GJjDY5e3QSy9UHq9Ha2jJe8DD5j81jwCdDpbHoSaNhm1vkF7kS1YWIkA */
        id: "rubberBranding",
        initial: "idle",
        states: {
          idle: {
            on: {
              MOUSECLICK: {
                target: "Drawing",
                actions: {
                  type: "createLine",
                },
              },
            },
          },
          Drawing: {
            on: {
              MOUSEMOVE: [
                {
                  target: "Drawing",
                  cond: "pasPlein",
                  actions: {
                    type: "setLastPoint",
                  },
                },
                {
                  target: "idle",
                  actions: {
                    type: "saveLine",
                  },
                },
              ],
              MOUSECLICK: {
                target: "Drawing",
                actions: {
                  type: "addPoint",
                },
              },
              Backspace: {
                target: "Drawing",
                cond: "plusDeDeuxPoints",
                actions: {
                  type: "removeLastPoint",
                },
              },
              Enter: {
                target: "idle",
                cond: "plusDeDeuxPoints",
                actions: {
                  type: "saveLine",
                },
              },
              Escape: {
                target: "idle",
                actions: {
                  type: "abandon",
                },
              },
            },
          },
        },
    },
    // Quelques actions et guardes que vous pouvez utiliser dans votre machine
    {
        actions: {
            // Créer une nouvelle polyline
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                layer.add(polyline);
            },
            // Mettre à jour le dernier point (provisoire) de la polyline
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                layer.batchDraw();
            },
            // Enregistrer la polyline
            saveLine: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                layer.batchDraw();
            },
            // Ajouter un point à la polyline
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
            },
            // Abandonner le tracé de la polyline
            abandon: (context, event) => {
                polyline.remove();
            },
            // Supprimer le dernier point de la polyline
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            // On peut encore ajouter un point
            pasPlein: (context, event) => {
                return polyline.points().length < MAX_POINTS * 2;
            },
            // On peut enlever un point
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 4;
            },
        },
    }
);

// On démarre la machine
const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();

// On envoie les événements à la machine
stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    // Enverra "a", "b", "c", "Escape", "Backspace", "Enter"... à la machine
    polylineService.send(event.key);
});

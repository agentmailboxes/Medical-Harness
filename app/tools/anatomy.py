from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

SceneId = Literal["head", "neck", "shoulder", "chest", "abdomen", "pelvis", "spine", "elbow", "hand", "knee", "lower_leg", "foot"]
SCENE_LABELS = {
    "head": "Head and brain", "neck": "Neck", "shoulder": "Shoulder",
    "chest": "Chest", "abdomen": "Abdomen", "pelvis": "Pelvis and hip",
    "spine": "Back and spine", "elbow": "Elbow", "hand": "Hand and wrist",
    "knee": "Knee", "lower_leg": "Lower leg", "foot": "Foot and ankle",
}


class AnatomyContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scene_id: SceneId
    label: str
    reason: str = Field(min_length=1, max_length=180)


def select_anatomy(value):
    if not isinstance(value, dict):
        return None
    scene_id = value.get("scene_id")
    if not isinstance(scene_id, str) or scene_id not in SCENE_LABELS:
        return None
    try:
        return AnatomyContext(scene_id=scene_id, label=SCENE_LABELS[scene_id],
                              reason=value.get("reason")).model_dump()
    except ValidationError:
        return None

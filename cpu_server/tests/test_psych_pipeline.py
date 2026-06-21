import os
import json
import pytest
from pydantic import ValidationError
from cpu_server.scripts.parse_psych_data import PsychologicalGraph, Entity, Relationship

def test_pydantic_schema_validation():
    # Valid data
    valid_data = {
        "entities": [
            {"name": "Áp lực công việc", "label": "Trigger", "description": "Quá tải công việc"},
            {"name": "Kiệt sức", "label": "Emotion", "description": "Tình trạng kiệt sức"},
            {"name": "Mất ngủ", "label": "Symptom", "description": "Không ngủ được"},
            {"name": "Thiền chánh niệm", "label": "CopingStrategy", "description": "Mindfulness meditation"}
        ],
        "relationships": [
            {"source": "Áp lực công việc", "type": "CAUSES", "target": "Kiệt sức"},
            {"source": "Kiệt sức", "type": "MANIFESTS_AS", "target": "Mất ngủ"},
            {"source": "Thiền chánh niệm", "type": "MANAGES", "target": "Kiệt sức"}
        ]
    }
    
    graph = PsychologicalGraph.model_validate(valid_data)
    assert len(graph.entities) == 4
    assert len(graph.relationships) == 3
    assert graph.entities[0].name == "Áp lực công việc"
    assert graph.relationships[0].type == "CAUSES"

def test_pydantic_invalid_label():
    invalid_data = {
        "entities": [
            {"name": "Áp lực công việc", "label": "InvalidLabelType", "description": "Should fail"}
        ],
        "relationships": []
    }
    with pytest.raises(ValidationError):
        PsychologicalGraph.model_validate(invalid_data)

def test_pydantic_invalid_relationship_type():
    invalid_data = {
        "entities": [
            {"name": "Áp lực công việc", "label": "Trigger"},
            {"name": "Kiệt sức", "label": "Emotion"}
        ],
        "relationships": [
            {"source": "Áp lực công việc", "type": "LOVES", "target": "Kiệt sức"}
        ]
    }
    with pytest.raises(ValidationError):
        PsychologicalGraph.model_validate(invalid_data)

def test_parse_psych_data_script_load():
    # Make sure we can import and instantiate the graph structure
    graph = PsychologicalGraph(entities=[], relationships=[])
    assert isinstance(graph.entities, list)
    assert isinstance(graph.relationships, list)

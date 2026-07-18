---
title: "Breadth-First Search (using Python)"
author: "Bomin Chuang"
date: "2023-07-09"
description: "An introduction to breadth-first search, with a Python implementation, complexity analysis, and traversal example."
tags:
  - "Algorithm"
---

## Steps

1. Add the vertex to start the breadth-first search to the empty queue. Mark that vertex visited.
2. Extract a vertex from the queue and add its neighbors to the queue if they are not marked visited.
3. Repeat step 2 until the queue is empty.

#### Add the vertex to start the breadth-first search to the empty queue. Mark that vertex visited.（從 A 開始）

![Start BFS from A](https://imgur.com/6xAY9FT.jpg)

#### Extract a vertex from the queue and add its neighbors to the queue if they are not marked visited.

![Extract a vertex from the queue](https://imgur.com/bAZPV8V.jpg)

#### We mark the vertices B and C as visited because we added these to the queue.

![Mark B and C as visited](https://imgur.com/AjHasA5.jpg)

![BFS queue progression](https://imgur.com/7qwO4cC.jpg)

#### Then we mark vertices D and E visited because we added these to the queue.

![Mark D and E as visited](https://imgur.com/VepENhs.jpg)

#### We extract vertex C from the queue. However, we do not add any vertex to the queue because we have already visited all neighbors of vertex C.

![Extract C from the queue](https://imgur.com/0QcY0wt.jpg)

#### We are going to extract vertices D and E, but we have also visited these neighbors before. The queue is empty and we finish the search. Finally, we have visited all reachable vertices from vertex A.

## Code

```python
from collections import deque


def bfs(graph, vertex):
    queue = deque([vertex])

    # The level holds distances from the vertex from which we start searching.
    level = {vertex: 0}

    # The parent holds the vertex just added as a key and the vertex from
    # which we reach the vertex just added as a value.
    parent = {vertex: None}

    while queue:
        v = queue.popleft()

        # graph[v] returns neighbors of vertex v.
        for n in graph[v]:
            if n not in level:
                queue.append(n)

                # We increment the level after expanding the current vertex.
                level[n] = level[v] + 1
                parent[n] = v

    return level, parent


# Input
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'D'],
    'D': ['B', 'C', 'E'],
    'E': ['B', 'D'],
}

print(bfs(graph, 'A'))
```

## Output

```text
({'A': 0, 'B': 1, 'C': 1, 'D': 2, 'E': 2},  # level
 {'A': None, 'B': 'A', 'C': 'A', 'D': 'B', 'E': 'B'})  # parent
```

## Time Complexity

#### O(|V| + |E|)

Vertices: `v = queue.popleft()`

`E` is the set of edges.

## Conclusion

1. The `level` holds distances from the vertex from which we start searching.
2. The distance from the vertex to itself is 0, so we initialize `level` accordingly.
3. The `parent` holds the vertex just added as a key and the vertex from which we reach that vertex as a value.

## Reference

1. [Understanding the Breadth-First Search with Python](https://shorturl.at/abzCZ)
2. [MIT OpenCourseWare 6.006 Lecture 13: Breadth-First Search](https://youtu.be/s-CYnVz-uh4)

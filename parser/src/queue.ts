// Adapted from algs4 Implementation of Queue.java
// https://algs4.cs.princeton.edu/code/edu/princeton/cs/algs4/Queue.java.html
// algs4, Robert Sedgewick and Kevin Wayne

// helper linked list class
class QueueNode<T> {
  item: T
  next: QueueNode<T>|null = null

  constructor(item : T) {
    this.item = item
  }
}

export class Queue<T> {
  first : QueueNode<T>|null  // beginning of queue
  last : QueueNode<T>|null   // end of queue
  n : number                 // number of elements on queue

  /**
   * Initializes an empty queue.
   */
  constructor() {
    this.first = null
    this.last  = null
    this.n = 0
  }

  /**
   * Returns true if this queue is empty.
   *
   * @return {@code true} if this queue is empty {@code false} otherwise
   */
  isEmpty() : boolean {
      return this.first == null
  }

  /**
   * Returns the number of items in this queue.
   *
   * @return the number of items in this queue
   */
  size() : number {
      return this.n
  }

  /**
   * Returns the item least recently added to this queue.
   *
   * @return the item least recently added to this queue
   * @throws NoSuchElementException if this queue is empty
   */
  peek() : T|null {
      if (this.isEmpty()) throw new Error("Queue underflow")
      return this.first!.item // this.first should not be null
  }

  /**
   * Adds the item to this queue.
   *
   * @param  item the item to add
   */
  enqueue(item: T) {
      const oldlast = this.last
      this.last = new QueueNode<T>(item)
      this.last.next = null
      if (this.isEmpty()) this.first = this.last
      else           oldlast!.next = this.last
      this.n++
  }

  /**
   * Removes and returns the item on this queue that was least recently added.
   *
   * @return the item on this queue that was least recently added
   * @throws NoSuchElementException if this queue is empty
   */
  dequeue() : T {
      if (this.isEmpty()) throw new Error("Queue underflow")
      const item = this.first!.item
      this.first = this.first!.next
      this.n--
      if (this.isEmpty()) this.last = null   // to avoid loitering
      return item
  }
}
